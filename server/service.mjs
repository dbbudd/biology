/* =============================================================
   The change service's four operations
   -------------------------------------------------------------
   Framework-agnostic on purpose. The plain Node server, the Azure
   Functions adapter and the tests all call these same functions,
   so what you test locally is what runs in production.

   Identity comes from the caller's token, never from the body.
   That single rule is what makes "who approved this" a fact
   rather than a claim, and it is why the handlers take an
   `actor` argument instead of reading `approved_by` from input.
   ============================================================= */

export class ServiceError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'ServiceError';
    this.status = status;
  }
}

const MAX_FIELD = 2000;

function requireText(value, field) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) throw new ServiceError(400, `"${field}" is required`);
  if (text.length > MAX_FIELD) {
    throw new ServiceError(400, `"${field}" is longer than ${MAX_FIELD} characters`);
  }
  return text;
}

export function createService({ github, agentAssignee }) {
  if (!github) throw new Error('createService: github client is required');

  return {
    /** POST /requests — turn a teacher's brief into an issue and start a draft. */
    async createRequest(input, actor) {
      if (!actor) throw new ServiceError(401, 'Not signed in');

      const chapter = requireText(input && input.chapter, 'chapter');
      const change = requireText(input && input.change, 'change');
      const doneWhen = typeof (input && input.doneWhen) === 'string'
        ? input.doneWhen.trim().slice(0, MAX_FIELD)
        : '';

      const issue = await github.createRequest({ chapter, change, doneWhen });

      // A teacher's name goes on the request in a comment, so the history names
      // a person even though the issue author is the service identity.
      await github.commentOnThread(issue.number, [
        `Requested by **${actor.name}**.`,
        '',
        'The assistant will open a draft; nothing is published until you say so.',
      ].join('\n'));

      // Assignment is best-effort: if Copilot cannot be assigned the request
      // still exists and is still visible, which is better than losing it.
      let assignment = { skipped: true };
      try {
        assignment = await github.assignAgent(issue.number, agentAssignee);
      } catch (err) {
        assignment = { failed: String(err.message || err) };
      }

      return { request: issue.number, url: issue.url, assignment };
    },

    /** GET /requests/:id — what the page polls. */
    async getRequest(id, actor) {
      if (!actor) throw new ServiceError(401, 'Not signed in');
      const issueNumber = Number(id);
      if (!Number.isInteger(issueNumber) || issueNumber < 1) {
        throw new ServiceError(400, 'Invalid request number');
      }

      const issue = await github.getIssue(issueNumber);
      const comments = await github.getComments(issueNumber);

      let draft;
      try {
        draft = await github.findDraft(issueNumber);
      } catch {
        draft = undefined;
      }

      return {
        request: issueNumber,
        state: issue.state,
        title: issue.title,
        draftSummary: summariseDraft(comments),
        draft: draft || null,
      };
    },

    /** POST /requests/:id/corrections — pass the teacher's words through. */
    async addCorrection(id, input, actor) {
      if (!actor) throw new ServiceError(401, 'Not signed in');
      const text = requireText(input && input.text, 'text');
      const issueNumber = Number(id);

      const draft = await github.findDraft(issueNumber);
      if (!draft) throw new ServiceError(409, 'There is no draft to correct yet');

      // Deliberately verbatim: paraphrasing into engineering language loses
      // exactly the intent the teacher was trying to convey.
      await github.commentOnThread(draft.number, `@copilot ${text}`);
      return { draft: draft.number };
    },

    /** POST /requests/:id/publish — the teacher's decision, recorded. */
    async publish(id, input, actor) {
      if (!actor) throw new ServiceError(401, 'Not signed in');
      const issueNumber = Number(id);

      const draft = await github.findDraft(issueNumber);
      if (!draft) throw new ServiceError(409, 'There is no draft to publish');
      if (draft.merged) throw new ServiceError(409, 'That draft is already published');

      const expected = input && input.headSha;
      if (expected && expected !== draft.headSha) {
        throw new ServiceError(
          409,
          'The draft changed after you looked at it. Refresh to see the current version, then publish again.'
        );
      }

      // The approver is the authenticated caller. This is the one field that
      // must never be accepted from the request body.
      const result = await github.dispatchPublish({
        prNumber: draft.number,
        headSha: draft.headSha,
        approvedBy: actor.email || actor.name,
        requestNumber: issueNumber,
      });

      return { published: true, draft: draft.number, ...result };
    },
  };
}

/** The draft summary is the comment generated from the diff, not the agent's own. */
export function summariseDraft(comments) {
  const marker = '<!-- draft-ready -->';
  const found = (comments || []).find((c) => String(c.body || '').includes(marker));
  if (!found) return '';
  return String(found.body).split(marker).join('').trim();
}
