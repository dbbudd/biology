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

/** The parts of a fetch or AadHttpClient response this code relies on. */
interface IHttpResult {
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
}

/** One row of GET /requests — the shape the change service returns. */
interface IMineRequest {
  request: number;
  title: string;
  status: 'requested' | 'drafting' | 'ready' | 'published';
  createdAt?: string;
  updatedAt?: string;
  draftNumber?: number;
  canPublish?: boolean;
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
      const button = target ? (target.closest('[data-complete]') as HTMLElement | null) : null;
      if (!button) return;
      ev.preventDefault();
      this.complete(button.getAttribute('data-complete') || '').catch(() => undefined);
    });

    this.loadChapters().catch(() => undefined);
    this.loadMine().catch(() => undefined);
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
            <h2 class="${styles.cardTitle}">Your requests</h2>
            <ul class="${styles.list}" id="bc-mine"><li class="${styles.empty}">Loading…</li></ul>
          </section>

          <section class="${styles.section}">
            <h2 class="${styles.cardTitle}">Recently published in the course</h2>
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

  /** The course-wide list of what has gone live. Public data, no service needed. */
  private async loadActivity(): Promise<void> {
    const base = this.settings.apiBase;
    const repo = this.settings.repo;
    let pulls: IGitHubItem[] = [];

    try {
      const res = await fetch(`${base}/repos/${repo}/pulls?state=all&per_page=30`, {
        credentials: 'omit',
      });
      if (res.ok) pulls = (await res.json()) as IGitHubItem[];
    } catch (err) {
      if (this.settings.debug) console.warn('[BiologyChanges] published list unavailable', err);
    }

    this.renderPublished(pulls);
  }

  /**
   * This teacher's own requests, from the change service. The status words are
   * the teacher's: requested, drafting, ready to publish, published.
   */
  private async loadMine(): Promise<void> {
    if (!this.settings.serviceUrl) {
      this.fill('#bc-mine', [], 'Connect the change service to see your requests here.');
      return;
    }
    try {
      const data = await this.call<{ requests?: IMineRequest[] }>('/requests', 'GET');
      this.renderMine((data && data.requests) || []);
    } catch (err) {
      this.fill('#bc-mine', [], 'Your requests could not be loaded just now.');
      if (this.settings.debug) console.warn('[BiologyChanges] own requests unavailable', err);
    }
  }

  private renderMine(requests: IMineRequest[]): void {
    const items = requests.map((r) => {
      const chip = r.status === 'published' ? 'Published'
        : r.status === 'ready' ? 'Ready to publish'
        : r.status === 'drafting' ? 'Drafting'
        : 'Requested';
      const done = r.status === 'published';
      const ready = r.status === 'ready';
      return this.item({
        title: r.title,
        chip,
        when: r.updatedAt,
        done,
        ready,
        completeKey: ready ? String(r.request) : undefined,
      });
    });
    this.fill('#bc-mine', items, 'You have not asked for any changes yet.');
  }

  private renderPublished(pulls: IGitHubItem[]): void {
    const items = pulls
      .filter((p) => p.merged_at)
      .sort((a, b) => Date.parse(b.merged_at || '') - Date.parse(a.merged_at || ''))
      .map((p) => this.item({
        title: this.plainTitle(p.title),
        chip: 'Published',
        when: p.merged_at || undefined,
        summary: this.section(p.body, 'What changed'),
        done: true,
      }));

    this.fill('#bc-published', items, 'Nothing has been published yet.');
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
    ready?: boolean;
    completeKey?: string;
  }): string {
    const date = o.when
      ? new Date(o.when).toLocaleDateString(undefined, {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
      : '';

    const action = o.completeKey
      ? `<button class="${styles.publish}" type="button" data-complete="${escapeHtml(o.completeKey)}">Publish</button>`
      : '';
    const summary = o.summary ? `<p class="${styles.summary}">${escapeHtml(o.summary)}</p>` : '';

    return `
      <li class="${styles.item}">
        <div class="${styles.itemHead}">
          <span class="${styles.itemTitle}">${escapeHtml(o.title)}</span>
          <span class="${o.done ? styles.chipDone : o.ready ? styles.chipReady : styles.chip}">${escapeHtml(o.chip)}</span>
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
  private async call<T = unknown>(
    servicePath: string,
    method: 'GET' | 'POST',
    body?: unknown
  ): Promise<T> {
    const s = this.settings;
    if (!s.serviceUrl) throw new Error('change service is not configured');

    const hasBody = body !== undefined;
    let res: IHttpResult;

    if (s.serviceResource) {
      // AadHttpClient attaches the signed-in teacher's token, which is how the
      // service knows who is asking instead of believing the page.
      const client = await this.context.aadHttpClientFactory.getClient(s.serviceResource);
      const url = `${s.serviceUrl}${servicePath}`;
      const config = AadHttpClient.configurations.v1;
      const init = {
        headers: { 'Content-Type': 'application/json' },
        body: hasBody ? JSON.stringify(body) : undefined,
      };
      res = method === 'GET'
        ? await client.get(url, config) as unknown as IHttpResult
        : await client.post(url, config, init) as unknown as IHttpResult;
    } else {
      res = await fetch(`${s.serviceUrl}${servicePath}`, {
        method,
        headers: hasBody ? { 'Content-Type': 'application/json' } : undefined,
        body: hasBody ? JSON.stringify(body) : undefined,
      }) as unknown as IHttpResult;
    }

    if (!res.ok) {
      let message = 'The change service refused the request.';
      try {
        const payload = await res.json() as { error?: string };
        if (payload && payload.error) message = payload.error;
      } catch {
        /* keep the generic message */
      }
      throw new Error(message);
    }

    if (res.status === 204) return undefined as unknown as T;
    return await res.json() as T;
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
      await this.call('/requests', 'POST', { chapter, change, doneWhen });
      this.say('Draft started. It usually takes 5–20 minutes; this page will show its status.');
      const form = this.panel.querySelector('#bc-form') as HTMLFormElement | null;
      if (form) form.reset();
      await this.loadMine();
    } catch (err) {
      this.say('That did not go through. Try again, or ask the site owner.');
      if (this.settings.debug) console.error('[BiologyChanges] submit failed', err);
    }
  }

  /** The teacher's decision to publish. The service records who made it. */
  private async complete(requestNumber: string): Promise<void> {
    if (!requestNumber) return;
    this.say('Publishing…');
    try {
      await this.call(`/requests/${encodeURIComponent(requestNumber)}/complete`, 'POST', {});
      this.say('Published. The site rebuilds in a minute or two.');
      await this.loadMine();
      await this.loadActivity();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Publishing did not go through.';
      this.say(message);
      if (this.settings.debug) console.error('[BiologyChanges] complete failed', err);
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
