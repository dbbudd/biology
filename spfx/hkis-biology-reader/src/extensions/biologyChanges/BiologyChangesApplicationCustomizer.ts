import { BaseApplicationCustomizer } from '@microsoft/sp-application-base';
import { AadHttpClient } from '@microsoft/sp-http';
import styles from './BiologyChanges.module.scss';

/**
 * The teacher's page: ask for a change, watch it being drafted, publish it.
 *
 * A separate customizer from the reader, on its own page
 * (/SitePages/biology-changes.aspx), with its own bundle, registration and
 * path guard. A mistake here cannot take the reader down, and vice versa.
 *
 * WHAT THIS PAGE CANNOT DO
 * ------------------------
 * It cannot change anything by itself. Writing to the repository needs a
 * credential, and a credential in client-side code is readable by every user
 * who can load the page. So every action that writes goes to a server-side
 * endpoint, authenticated with the user's own Entra token, and the credential
 * stays in Key Vault on the other side. Until that endpoint is configured
 * (`serviceUrl`), the page shows the status feed and a disabled form rather
 * than pretending to work.
 *
 * Reading is different: the chapter list comes from the reader's own toc.js
 * and the activity feed from the public GitHub API, both public data needing
 * no credential.
 */

interface IGitHubLabel {
  name?: string;
}

interface IGitHubItem {
  number?: number;
  title?: string;
  body?: string;
  state?: string;
  created_at?: string;
  updated_at?: string;
  merged_at?: string;
  draft?: boolean;
  labels?: Array<IGitHubLabel | string>;
  author_association?: string;
  pull_request?: unknown;
}

export interface IBiologyChangesApplicationCustomizerProperties {
  targetPath?: string;
  tocUrl?: string;
  apiBase?: string;
  repo?: string;
  serviceUrl?: string;
  serviceResource?: string;
  headerSelector?: string;
  debug?: boolean;
}

interface ISettings {
  targetPath: string;
  tocUrl: string;
  apiBase: string;
  repo: string;
  serviceUrl: string;
  serviceResource: string;
  headerSelector: string;
  debug: boolean;
}

const DEFAULTS = {
  targetPath: '/SitePages/biology-changes.aspx',
  tocUrl: 'https://dbbudd.github.io/biology/assets/toc.js',
  apiBase: 'https://api.github.com',
  repo: 'dbbudd/biology',
  headerSelector: '#spSiteHeader',
};

const PANEL_ID = 'biology-changes-panel';
const HEADER_RETRIES = 20;
const HEADER_RETRY_MS = 250;
const TRUSTED_ASSOCIATIONS = ['OWNER', 'MEMBER', 'COLLABORATOR'];

const stripTrailingSlash = (value: string): string => value.replace(/\/+$/, '');

const escapeHtml = (value: string): string =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

export default class BiologyChangesApplicationCustomizer extends BaseApplicationCustomizer<
  IBiologyChangesApplicationCustomizerProperties
> {
  private panel: HTMLDivElement | undefined;
  private bodyOverflow: string | undefined;
  private resizeHandler: (() => void) | undefined;
  private headerTimer: number | undefined;

  public onInit(): Promise<void> {
    this.context.application.navigatedEvent.add(this, this.sync);
    this.sync();
    return Promise.resolve();
  }

  public onDispose(): void {
    this.context.application.navigatedEvent.remove(this, this.sync);
    this.teardown();
  }

  /* ------------------------------ settings ------------------------------ */

  private get settings(): ISettings {
    const p: IBiologyChangesApplicationCustomizerProperties = this.properties || {};
    return {
      targetPath: p.targetPath || DEFAULTS.targetPath,
      tocUrl: p.tocUrl || DEFAULTS.tocUrl,
      apiBase: p.apiBase || DEFAULTS.apiBase,
      repo: p.repo || DEFAULTS.repo,
      serviceUrl: p.serviceUrl || '',
      serviceResource: p.serviceResource || '',
      headerSelector: p.headerSelector || DEFAULTS.headerSelector,
      debug: p.debug === true,
    };
  }

  private isTargetPage(): boolean {
    if (/[?&]mode=edit(&|=|$)/i.test(window.location.search)) return false;

    const here = stripTrailingSlash(window.location.pathname.toLowerCase());
    const web = stripTrailingSlash(
      (this.context.pageContext.web.serverRelativeUrl || '').toLowerCase()
    );
    const target = stripTrailingSlash(this.settings.targetPath.toLowerCase());
    const absolute = target.indexOf(web) === 0 && web.length > 0 ? target : web + target;

    return here === absolute;
  }

  private sync = (): void => {
    if (this.settings.debug) {
      console.log('[BiologyChanges]', {
        path: window.location.pathname,
        target: this.settings.targetPath,
        matched: this.isTargetPage(),
      });
    }
    if (this.isTargetPage()) {
      if (!this.panel) this.setup();
    } else {
      this.teardown();
    }
  };

  /* ------------------------------ shell ------------------------------ */

  private setup(): void {
    const stale = document.getElementById(PANEL_ID);
    if (stale && stale.parentNode) stale.parentNode.removeChild(stale);

    const panel = document.createElement('div');
    panel.id = PANEL_ID;
    panel.className = styles.panel;
    panel.setAttribute('role', 'region');
    panel.setAttribute('aria-label', 'Course changes');
    panel.innerHTML = this.template();
    document.body.appendChild(panel);

    this.bodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    this.panel = panel;

    this.resizeHandler = (): void => this.resize();
    window.addEventListener('resize', this.resizeHandler);
    this.waitForHeader(HEADER_RETRIES);

    panel.addEventListener('submit', (ev: Event): void => {
      ev.preventDefault();
      this.submitRequest().catch(() => undefined);
    });

    // One delegated handler: the activity list is rebuilt on every refresh, so
    // per-button listeners would leak with each render.
    panel.addEventListener('click', (ev: Event): void => {
      const target = ev.target as HTMLElement | null;
      const button = target ? (target.closest('[data-publish]') as HTMLElement | null) : null;
      if (!button) return;
      ev.preventDefault();
      this.publish(button.getAttribute('data-publish') || '').catch(() => undefined);
    });

    this.loadChapters().catch(() => undefined);
    this.loadActivity().catch(() => undefined);
  }

  private template(): string {
    const configured = this.settings.serviceUrl.length > 0;

    return `
      <div class="${styles.scroll}">
        <div class="${styles.inner}">
          <header class="${styles.head}">
            <h1 class="${styles.title}">Course changes</h1>
            <p class="${styles.lead}">
              Ask for a change to the course reader, and see what is already in progress.
              Nothing is published until you say so.
            </p>
          </header>

          ${configured ? '' : `
          <div class="${styles.notice}" role="status">
            <strong>Not connected yet.</strong> You can see what is in progress below, but
            submitting and publishing are switched off until the change service is connected.
          </div>`}

          <section class="${styles.card}">
            <h2 class="${styles.cardTitle}">Ask for a change</h2>
            <form class="${styles.form}" id="bc-form">
              <label class="${styles.label}" for="bc-chapter">Which chapter or section?</label>
              <input class="${styles.input}" id="bc-chapter" list="bc-chapters"
                     placeholder="e.g. 2.3 Two Halves of One Process" autocomplete="off" />
              <datalist id="bc-chapters"></datalist>

              <label class="${styles.label}" for="bc-change">What should change?</label>
              <textarea class="${styles.textarea}" id="bc-change" rows="4"
                placeholder="What is wrong now, and what should it say or do instead?"></textarea>

              <label class="${styles.label}" for="bc-done">How will we know it is right?</label>
              <input class="${styles.input}" id="bc-done"
                     placeholder="Optional. A test the draft has to pass." />

              <div class="${styles.actions}">
                <button class="${styles.primary}" id="bc-submit" type="submit"
                        ${configured ? '' : 'disabled'}>Start a draft</button>
                <span class="${styles.hint}" id="bc-status" role="status"></span>
              </div>
            </form>
          </section>

          <section class="${styles.section}">
            <h2 class="${styles.cardTitle}">Being worked on</h2>
            <ul class="${styles.list}" id="bc-progress"><li class="${styles.empty}">Loading…</li></ul>
          </section>

          <section class="${styles.section}">
            <h2 class="${styles.cardTitle}">Published</h2>
            <ul class="${styles.list}" id="bc-published"><li class="${styles.empty}">Loading…</li></ul>
          </section>
        </div>
      </div>`;
  }

  /* ------------------------------ data ------------------------------ */

  /** Chapter titles, parsed rather than evaluated: toc.js is our own file, but
      running remote script inside a SharePoint page is not a habit worth
      forming. */
  private async loadChapters(): Promise<void> {
    try {
      const res = await fetch(this.settings.tocUrl, { credentials: 'omit' });
      if (!res.ok) throw new Error(String(res.status));
      const text = await res.text();

      const titles: string[] = [];
      const re = /title:\s*'((?:[^'\\]|\\.)*)'/g;
      let match: RegExpExecArray | null = re.exec(text);
      while (match !== null) {
        if (titles.indexOf(match[1]) === -1) titles.push(match[1]);
        match = re.exec(text);
      }

      if (!this.panel) return;
      const list = this.panel.querySelector('#bc-chapters');
      if (!list) return;
      list.innerHTML = titles.map((t) => `<option value="${escapeHtml(t)}"></option>`).join('');
    } catch (err) {
      if (this.settings.debug) console.warn('[BiologyChanges] chapter list unavailable', err);
    }
  }

  private async loadActivity(): Promise<void> {
    const base = this.settings.apiBase;
    const repo = this.settings.repo;
    const opts: RequestInit = { credentials: 'omit' };

    let issues: IGitHubItem[] = [];
    let pulls: IGitHubItem[] = [];

    try {
      const [issuesRes, pullsRes] = await Promise.all([
        fetch(`${base}/repos/${repo}/issues?state=all&per_page=30`, opts),
        fetch(`${base}/repos/${repo}/pulls?state=all&per_page=30`, opts),
      ]);
      if (issuesRes.ok) issues = (await issuesRes.json()) as IGitHubItem[];
      if (pullsRes.ok) pulls = (await pullsRes.json()) as IGitHubItem[];
    } catch (err) {
      if (this.settings.debug) console.warn('[BiologyChanges] activity unavailable', err);
    }

    this.renderActivity(issues, pulls);
  }

  private isRequest(issue: IGitHubItem): boolean {
    if (!issue || issue.pull_request) return false;

    const labels = (issue.labels || []).map((l) => (typeof l === 'string' ? l : l.name || ''));
    if (labels.indexOf('change-request') !== -1) return true;

    const trusted =
      TRUSTED_ASSOCIATIONS.indexOf(String(issue.author_association || '').toUpperCase()) !== -1;
    return trusted && this.section(issue.body, 'Which chapter or section?').length > 0;
  }

  private renderActivity(issues: IGitHubItem[], pulls: IGitHubItem[]): void {
    if (!this.panel) return;
    const canPublish = this.settings.serviceUrl.length > 0;
    const byNewest = (a: IGitHubItem, b: IGitHubItem): number =>
      Date.parse(b.updated_at || '') - Date.parse(a.updated_at || '');

    const requested = issues
      .filter((i) => this.isRequest(i) && i.state === 'open')
      .sort(byNewest)
      .map((i) =>
        this.item({
          title: String(i.title || ''),
          chip: 'Requested',
          when: i.created_at,
          summary: this.section(i.body, 'What should change?'),
        })
      );

    const drafting = pulls
      .filter((p) => !p.merged_at)
      .sort(byNewest)
      .map((p) =>
        this.item({
          title: this.plainTitle(p.title),
          chip: 'Drafting',
          when: p.created_at,
          summary: this.section(p.body, 'What changed'),
          publishKey: canPublish && p.number !== undefined ? String(p.number) : undefined,
        })
      );

    const published = pulls
      .filter((p) => p.merged_at)
      .sort((a, b) => Date.parse(b.merged_at || '') - Date.parse(a.merged_at || ''))
      .map((p) =>
        this.item({
          title: this.plainTitle(p.title),
          chip: 'Published',
          when: p.merged_at || undefined,
          summary: this.section(p.body, 'What changed'),
          done: true,
        })
      );

    this.fill('#bc-progress', requested.concat(drafting), 'Nothing is in progress right now.');
    this.fill('#bc-published', published, 'Nothing has been published yet.');
  }

  private plainTitle(title?: string): string {
    return String(title || 'Untitled change').replace(/^\[change\]\s*/i, '');
  }

  /**
   * Pull the text under a "### Heading" from a change body.
   *
   * Line-based, with no regular expression assembled from a variable: a
   * dynamic pattern is a lint failure here and a small injection risk in
   * general.
   */
  private section(body: string | undefined, heading: string): string {
    if (!body) return '';

    const wanted = heading.replace(/\?$/, '').toLowerCase().trim();
    const lines = String(body).replace(/<!--[\s\S]*?-->/g, '').split('\n');
    const out: string[] = [];
    let collecting = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const isHeading = line.charAt(0) === '#';

      if (!collecting) {
        if (isHeading) {
          const text = line.replace(/^#+\s*/, '').replace(/\?$/, '').toLowerCase().trim();
          if (text === wanted) collecting = true;
        }
        continue;
      }

      if (isHeading) break;

      const cleaned = line
        .replace(/^\s*[-*]\s*\[[ x]\]\s*/i, '')
        .replace(/\*/g, '')
        .replace(/`/g, '')
        .trim();

      if (cleaned && cleaned !== '…') out.push(cleaned);
      if (out.length >= 2) break;
    }

    return out.join(' ');
  }

  private item(o: {
    title: string;
    chip: string;
    when?: string;
    summary?: string;
    done?: boolean;
    publishKey?: string;
  }): string {
    const date = o.when
      ? new Date(o.when).toLocaleDateString(undefined, {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
      : '';

    const action = o.publishKey
      ? `<button class="${styles.publish}" type="button" data-publish="${escapeHtml(o.publishKey)}">Publish</button>`
      : '';
    const summary = o.summary ? `<p class="${styles.summary}">${escapeHtml(o.summary)}</p>` : '';

    return `
      <li class="${styles.item}">
        <div class="${styles.itemHead}">
          <span class="${styles.itemTitle}">${escapeHtml(o.title)}</span>
          <span class="${o.done ? styles.chipDone : styles.chip}">${escapeHtml(o.chip)}</span>
          <span class="${styles.when}">${escapeHtml(date)}</span>
        </div>
        ${summary}
        ${action ? `<div class="${styles.itemActions}">${action}</div>` : ''}
      </li>`;
  }

  private fill(selector: string, html: string[], empty: string): void {
    if (!this.panel) return;
    const list = this.panel.querySelector(selector);
    if (!list) return;
    list.innerHTML = html.length
      ? html.join('')
      : `<li class="${styles.empty}">${escapeHtml(empty)}</li>`;
  }

  /* ------------------------------ actions ------------------------------ */

  private say(text: string): void {
    const status = this.panel
      ? (this.panel.querySelector('#bc-status') as HTMLElement | null)
      : null;
    if (status) status.textContent = text;
  }

  /** Every write goes through the service, which learns who is asking from the
      Entra token. The form never asserts an identity. */
  private async call(servicePath: string, body: unknown): Promise<boolean> {
    const s = this.settings;
    if (!s.serviceUrl) return false;

    if (s.serviceResource) {
      const client = await this.context.aadHttpClientFactory.getClient(s.serviceResource);
      const res = await client.post(`${s.serviceUrl}${servicePath}`, AadHttpClient.configurations.v1, {
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
      });
      return res.ok;
    }

    const res = await fetch(`${s.serviceUrl}${servicePath}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return res.ok;
  }

  private async submitRequest(): Promise<void> {
    if (!this.panel) return;
    const read = (id: string): string => {
      const el = this.panel ? (this.panel.querySelector(id) as HTMLInputElement | null) : null;
      return el ? el.value.trim() : '';
    };

    const chapter = read('#bc-chapter');
    const change = read('#bc-change');
    const doneWhen = read('#bc-done');

    if (!this.settings.serviceUrl) {
      this.say('Not connected yet.');
      return;
    }
    if (!chapter || !change) {
      this.say('Please say which chapter, and what should change.');
      return;
    }

    this.say('Starting…');
    try {
      const ok = await this.call('/requests', { chapter, change, doneWhen });
      if (!ok) throw new Error('service refused');
      this.say('Draft started. It usually takes 5–20 minutes; this page will show it.');
      const form = this.panel.querySelector('#bc-form') as HTMLFormElement | null;
      if (form) form.reset();
      await this.loadActivity();
    } catch (err) {
      this.say('That did not go through. Try again, or ask the site owner.');
      if (this.settings.debug) console.error('[BiologyChanges] submit failed', err);
    }
  }

  private async publish(pullRequest: string): Promise<void> {
    if (!pullRequest) return;
    this.say('Publishing…');
    try {
      const ok = await this.call(`/requests/${encodeURIComponent(pullRequest)}/publish`, {});
      if (!ok) throw new Error('service refused');
      this.say('Published. The site rebuilds in a minute or two.');
      await this.loadActivity();
    } catch (err) {
      this.say('Publishing did not go through. The draft may have changed — look again.');
      if (this.settings.debug) console.error('[BiologyChanges] publish failed', err);
    }
  }

  /* ------------------------------ geometry ------------------------------ */

  private waitForHeader(remaining: number): void {
    if (!this.panel) return;
    const header = document.querySelector(this.settings.headerSelector);
    this.resize();
    if (header) return;
    if (remaining <= 0) {
      if (this.settings.debug) {
        console.warn('[BiologyChanges] header not found:', this.settings.headerSelector);
      }
      return;
    }
    this.headerTimer = window.setTimeout((): void => this.waitForHeader(remaining - 1), HEADER_RETRY_MS);
  }

  private resize(): void {
    if (!this.panel) return;
    const header = document.querySelector(this.settings.headerSelector);
    let top = 0;
    if (header) {
      const rect = header.getBoundingClientRect();
      top = Math.max(0, Math.round(rect.bottom));
    }
    this.panel.style.top = top + 'px';
  }

  private teardown(): void {
    if (this.headerTimer !== undefined) {
      window.clearTimeout(this.headerTimer);
      this.headerTimer = undefined;
    }
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
      this.resizeHandler = undefined;
    }
    if (this.panel && this.panel.parentNode) {
      this.panel.parentNode.removeChild(this.panel);
    }
    this.panel = undefined;

    if (this.bodyOverflow !== undefined) {
      document.body.style.overflow = this.bodyOverflow;
      this.bodyOverflow = undefined;
    }
  }
}
