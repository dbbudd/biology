/* =============================================================
   GitHub client for the change service
   -------------------------------------------------------------
   The only place that knows the GitHub API. The token is injected
   from the environment and never leaves the server.

   Every call is written against the REST API with an explicit
   Accept header, because the default media type changes the shapes
   for several endpoints (timeline events in particular).

   `fetchImpl` is a parameter so tests can run the whole service
   against a fake that records calls, with no network involved.
   ============================================================= */

const DEFAULT_API = 'https://api.github.com';

const HEADERS = {
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
};

export class GitHubError extends Error {
  constructor(status, message, body) {
    super(message);
    this.name = 'GitHubError';
    this.status = status;
    this.body = body;
  }
}

export function createGitHubClient(options = {}) {
  const api = (options.api || DEFAULT_API).replace(/\/+$/, '');
  const repo = options.repo;
  const token = options.token;
  const fetchImpl = options.fetchImpl || globalThis.fetch;

  if (!repo) throw new Error('createGitHubClient: repo is required');

  async function request(method, path, payload) {
    if (!token) throw new Error('createGitHubClient: no token configured');

    const res = await fetchImpl(`${api}${path}`, {
      method,
      headers: {
        ...HEADERS,
        Authorization: `Bearer ${token}`,
        ...(payload ? { 'Content-Type': 'application/json' } : {}),
      },
      body: payload ? JSON.stringify(payload) : undefined,
    });

    if (res.status === 204) return undefined;

    const text = await res.text();
    const body = text ? JSON.parse(text) : undefined;

    if (!res.ok) {
      throw new GitHubError(res.status, `GitHub ${method} ${path} -> ${res.status}`, body);
    }
    return body;
  }

  return {
    repo,

    /** The issue body shape every parser in the repo depends on. */
    buildIssueBody({ chapter, change, doneWhen }) {
      return [
        '### Which chapter or section?',
        chapter,
        '',
        '### What should change?',
        change,
        '',
        '### How will we know it is right?',
        doneWhen || 'Not specified.',
      ].join('\n');
    },

    async createRequest({ chapter, change, doneWhen }) {
      const issue = await request('POST', `/repos/${repo}/issues`, {
        title: `[change] ${String(chapter).slice(0, 120)}`,
        body: this.buildIssueBody({ chapter, change, doneWhen }),
        labels: ['change-request'],
      });
      return { number: issue.number, url: issue.html_url, title: issue.title };
    },

    /**
     * Hand the issue to the Copilot agent.
     *
     * The login is configurable because it differs by surface, and a wrong
     * guess fails quietly. Discover it from GET /repos/{repo}/assignees after
     * seeing Copilot offer itself in the web UI.
     */
    async assignAgent(issueNumber, assignee) {
      if (!assignee) return { skipped: true };
      await request('POST', `/repos/${repo}/issues/${issueNumber}/assignees`, {
        assignees: [assignee],
      });
      return { assigned: assignee };
    },

    async getIssue(issueNumber) {
      return request('GET', `/repos/${repo}/issues/${issueNumber}`);
    },

    async getComments(issueNumber) {
      return request('GET', `/repos/${repo}/issues/${issueNumber}/comments?per_page=100`);
    },

    /** The pull request the agent opened for this issue, if any. */
    async findDraft(issueNumber) {
      const events = await request(
        'GET',
        `/repos/${repo}/issues/${issueNumber}/timeline?per_page=100`,
        undefined
      );
      const linked = (events || []).filter(
        (e) => e.event === 'cross-referenced' && e.source && e.source.issue && e.source.issue.pull_request
      );
      if (!linked.length) return undefined;

      const prNumber = linked[linked.length - 1].source.issue.number;
      const pr = await request('GET', `/repos/${repo}/pulls/${prNumber}`);
      return {
        number: pr.number,
        headSha: pr.head && pr.head.sha,
        merged: Boolean(pr.merged_at),
        title: pr.title,
        url: pr.html_url,
      };
    },

    /** Works for issues and pull requests: both are issues in this API. */
    async commentOnThread(number, body) {
      const comment = await request('POST', `/repos/${repo}/issues/${number}/comments`, { body });
      return { url: comment.html_url };
    },

    /**
     * Publish by dispatching the workflow.
     *
     * The commit is pinned here, on the server, from the PR's current head —
     * never from the client. The workflow re-checks it, but pinning it here
     * means "publish what the teacher is looking at" is decided in one place.
     */
    async dispatchPublish({ prNumber, headSha, approvedBy, requestNumber }) {
      await request('POST', `/repos/${repo}/actions/workflows/publish-draft.yml/dispatches`, {
        ref: 'main',
        inputs: {
          pull_request: String(prNumber),
          head_sha: headSha,
          approved_by: approvedBy,
          request: String(requestNumber),
        },
      });
      return { dispatched: true, headSha };
    },
  };
}

export default createGitHubClient;
