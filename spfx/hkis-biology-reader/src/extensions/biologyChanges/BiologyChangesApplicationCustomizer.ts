import { BaseApplicationCustomizer } from '@microsoft/sp-application-base';
import styles from './BiologyChanges.module.scss';

/**
 * The teacher's page — deliberately small.
 *
 * It does two things: sends a teacher to GitHub's issue form to describe a
 * change, and shows what is in flight or recently published. It holds no
 * credential and calls no service, because it does not write anything: the
 * teacher's own GitHub account creates the issue.
 *
 * That is the whole design. Earlier versions tried to submit on the teacher's
 * behalf, which needed a token somewhere, which needed a server or a public
 * secret. A button does not.
 *
 * The status lists read the public API anonymously, so the page is useful
 * before anyone has created a GitHub account.
 */

export interface IBiologyChangesApplicationCustomizerProperties {
  /** The page this may take over. */
  targetPath?: string;
  /** Where teachers go to describe a change. */
  newIssueUrl?: string;
  /** The repository's issue list, for browsing. */
  issuesUrl?: string;
  /** Public GitHub API for the status lists. */
  apiBase?: string;
  /** Repository whose changes are shown. */
  repo?: string;
  /** 'all' | 'header' | 'none' — which SharePoint chrome to remove. */
  chromeMode?: string;
  headerSelector?: string;
  debug?: boolean;
}

interface ISettings {
  targetPath: string;
  newIssueUrl: string;
  issuesUrl: string;
  apiBase: string;
  repo: string;
  chromeMode: string;
  headerSelector: string;
  debug: boolean;
}

const DEFAULTS = {
  targetPath: '/SitePages/biology-changes.aspx',
  newIssueUrl: 'https://github.com/dbbudd/biology/issues/new/choose',
  issuesUrl: 'https://github.com/dbbudd/biology/issues',
  apiBase: 'https://api.github.com',
  repo: 'dbbudd/biology',
  chromeMode: 'header',
  headerSelector: '#spSiteHeader',
};

const PANEL_ID = 'biology-changes-panel';
const CHROME_CLASS = 'bio-changes-chrome-hidden';
const CHROME_STYLE_ID = 'bio-changes-chrome-style';
const HEADER_RETRIES = 20;
const HEADER_RETRY_MS = 250;

const SUITE_SELECTORS = [
  '#SuiteNavWrapper', '#SuiteNavPlaceHolder', '#sp-appBar',
  '[data-sp-feature-tag="Suite Navigation Placeholder"]',
  '[data-automation-id="suiteNavWrapper"]', '.ms-Suitebar',
  'header.spoMainBar', 'header[data-automation-id="suiteHeader"]',
];

const HEADER_SELECTORS = [
  '[data-automation-id="SiteHeader"]', '.spSiteHeader',
  'div[data-automation-id="SiteHeader"]', '[class*="shyHeader"]',
];

const stripTrailingSlash = (value: string): string => value.replace(/\/+$/, '');

const escapeHtml = (value: string): string =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

interface IGitHubItem {
  title?: string;
  body?: string;
  state?: string;
  created_at?: string;
  updated_at?: string;
  merged_at?: string;
  labels?: Array<{ name?: string } | string>;
  pull_request?: unknown;
}

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
      newIssueUrl: p.newIssueUrl || DEFAULTS.newIssueUrl,
      issuesUrl: p.issuesUrl || DEFAULTS.issuesUrl,
      apiBase: p.apiBase || DEFAULTS.apiBase,
      repo: p.repo || DEFAULTS.repo,
      chromeMode: p.chromeMode || DEFAULTS.chromeMode,
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

    const button = panel.querySelector('#bc-new');
    if (button) {
      button.addEventListener('click', (ev: Event): void => {
        ev.preventDefault();
        window.open(this.settings.newIssueUrl, '_blank', 'noopener');
      });
    }

    this.loadActivity().catch(() => undefined);
  }

  private template(): string {
    const issuesUrl = escapeHtml(this.settings.issuesUrl);

    return `
      <div class="${styles.scroll}">
        <div class="${styles.inner}">
          <header class="${styles.head}">
            <h1 class="${styles.title}">Course changes</h1>
            <p class="${styles.lead}">
              Ask for a change to the course reader, then follow it here. Nothing goes live
              until it has been checked and approved.
            </p>
          </header>

          <section class="${styles.card}">
            <h2 class="${styles.cardTitle}">Ask for a change</h2>

            <button class="${styles.primary}" id="bc-new" type="button">Request a change</button>

            <p class="${styles.hint}" style="margin-top:0.9rem">
              This opens a short form. You need a GitHub account to submit it — free, and
              separate from your school login.
            </p>

            <h3 class="${styles.cardTitle}" style="margin-top:1.6rem">What makes a useful request</h3>
            <ul class="${styles.hint}" style="margin:0.4rem 0 0;padding-left:1.1rem;line-height:1.7">
              <li><strong>Where</strong> — the chapter or section, as it appears in the reader.</li>
              <li><strong>What is wrong</strong> — and what it should say or do instead.</li>
              <li><strong>How you will know it is right</strong> — the test the new wording must pass.</li>
            </ul>
            <p class="${styles.hint}" style="margin-top:0.9rem">
              One change per request. A request asking for three things is slow to check and
              easy to get half right.
            </p>
          </section>

          <section class="${styles.section}">
            <h2 class="${styles.cardTitle}">In progress</h2>
            <ul class="${styles.list}" id="bc-progress"><li class="${styles.empty}">Loading…</li></ul>
          </section>

          <section class="${styles.section}">
            <h2 class="${styles.cardTitle}">Recently published</h2>
            <ul class="${styles.list}" id="bc-published"><li class="${styles.empty}">Loading…</li></ul>
          </section>

          <p class="${styles.hint}" style="margin-top:2rem">
            Every request and draft is also listed at
            <a href="${issuesUrl}" target="_blank" rel="noopener">the full list on GitHub</a>.
          </p>
        </div>
      </div>`;
  }

  /* ------------------------------ data ------------------------------ */

  private async loadActivity(): Promise<void> {
    const base = this.settings.apiBase;
    const repo = this.settings.repo;
    const opts: RequestInit = { credentials: 'omit' };

    let issues: IGitHubItem[] = [];
    let pulls: IGitHubItem[] = [];

    try {
      const [issueRes, pullRes] = await Promise.all([
        fetch(`${base}/repos/${repo}/issues?state=open&per_page=20`, opts),
        fetch(`${base}/repos/${repo}/pulls?state=all&per_page=30`, opts),
      ]);
      if (issueRes.ok) issues = (await issueRes.json()) as IGitHubItem[];
      if (pullRes.ok) pulls = (await pullRes.json()) as IGitHubItem[];
    } catch (err) {
      if (this.settings.debug) console.warn('[BiologyChanges] status unavailable', err);
    }

    this.renderActivity(issues, pulls);
  }

  private renderActivity(issues: IGitHubItem[], pulls: IGitHubItem[]): void {
    if (!this.panel) return;

    const requested = issues
      .filter((i) => !i.pull_request)
      .map((i) => this.item(this.plainTitle(i.title), 'Requested', i.created_at, undefined, false));

    const drafting = pulls
      .filter((p) => !p.merged_at)
      .map((p) => this.item(this.plainTitle(p.title), 'Drafting', p.created_at, undefined, false));

    const published = pulls
      .filter((p) => p.merged_at)
      .sort((a, b) => Date.parse(b.merged_at || '') - Date.parse(a.merged_at || ''))
      .map((p) =>
        this.item(this.plainTitle(p.title), 'Published', p.merged_at, this.section(p.body, 'What changed'), true)
      );

    this.fill('#bc-progress', requested.concat(drafting), 'Nothing is in progress right now.');
    this.fill('#bc-published', published, 'Nothing has been published yet.');
  }

  private plainTitle(title?: string): string {
    return String(title || 'Untitled change').replace(/^\[change\]\s*/i, '');
  }

  /** Text under a "### Heading", without building a regex from a variable. */
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

  private item(
    title: string,
    chip: string,
    when: string | undefined,
    summary: string | undefined,
    done: boolean
  ): string {
    const date = when
      ? new Date(when).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
      : '';

    return `
      <li class="${styles.item}">
        <div class="${styles.itemHead}">
          <span class="${styles.itemTitle}">${escapeHtml(title)}</span>
          <span class="${done ? styles.chipDone : styles.chip}">${escapeHtml(chip)}</span>
          <span class="${styles.when}">${escapeHtml(date)}</span>
        </div>
        ${summary ? `<p class="${styles.summary}">${escapeHtml(summary)}</p>` : ''}
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

  /* ------------------------------ chrome and geometry ------------------------------ */

  private applyChrome(): void {
    const mode = this.settings.chromeMode;
    if (mode !== 'all' && mode !== 'header') return;

    document.body.classList.add(CHROME_CLASS);
    if (document.getElementById(CHROME_STYLE_ID)) return;

    const prefix = '#' + CHROME_CLASS + ' ';
    const rules: string[] = [];

    if (mode === 'all') {
      SUITE_SELECTORS.forEach((sel: string): void => { rules.push(prefix + sel + ','); });
    }
    HEADER_SELECTORS.forEach((sel: string): void => { rules.push(prefix + sel + ','); });

    rules[rules.length - 1] = rules[rules.length - 1].replace(/,$/, '') + ' { display: none !important; }';
    rules.push(prefix + '#spPageCanvasContent { padding-top: 0 !important; }');

    const style = document.createElement('style');
    style.id = CHROME_STYLE_ID;
    style.textContent = rules.join('\n');
    document.head.appendChild(style);
  }

  private removeChrome(): void {
    document.body.classList.remove(CHROME_CLASS);
    const style = document.getElementById(CHROME_STYLE_ID);
    if (style && style.parentNode) style.parentNode.removeChild(style);
  }

  private suiteBarBottom(): number {
    for (let i = 0; i < SUITE_SELECTORS.length; i++) {
      const el = document.querySelector(SUITE_SELECTORS[i]);
      if (el) return Math.max(0, el.getBoundingClientRect().bottom);
    }
    return 48;
  }

  private waitForHeader(remaining: number): void {
    if (!this.panel) return;
    this.applyChrome();
    this.resize();
    if (document.querySelector(this.settings.headerSelector)) return;
    if (remaining <= 0) {
      if (this.settings.debug) {
        console.warn('[BiologyChanges] header not found:', this.settings.headerSelector);
      }
      return;
    }
    this.headerTimer = window.setTimeout(
      (): void => this.waitForHeader(remaining - 1),
      HEADER_RETRY_MS
    );
  }

  private resize(): void {
    if (!this.panel) return;
    const mode = this.settings.chromeMode;

    if (mode === 'all') {
      this.panel.style.top = '0px';
      return;
    }
    if (mode === 'header') {
      this.panel.style.top = Math.round(this.suiteBarBottom()) + 'px';
      return;
    }
    const header = document.querySelector(this.settings.headerSelector);
    let top = 0;
    if (header) top = Math.max(0, Math.round(header.getBoundingClientRect().bottom));
    this.panel.style.top = top + 'px';
  }

  private teardown(): void {
    this.removeChrome();

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
