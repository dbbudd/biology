import { BaseApplicationCustomizer } from '@microsoft/sp-application-base';

/**
 * Full-facade wrapper for the Biology course reader.
 *
 * Registered on the web (see sharepoint/assets/elements.xml) so it survives the
 * page being renamed or moved. It therefore has to decide, at runtime, whether
 * it is on the page it was built for. That guard — not the registration — is
 * the real scope, and it is the first thing to check when something goes wrong.
 *
 * Two lessons are baked in here, both learned on the handbook experience:
 *
 * 1. Match the page against `web.serverRelativeUrl`, not a hard-coded
 *    '/sites/HSStudents'. A site rename should not silently produce a bare page.
 * 2. SharePoint lazy-renders. `#spSiteHeader` may not exist at onInit, and if
 *    the header is not found the panel starts at 0 and covers the navigation.
 *    So the measurement polls for a few seconds before giving up.
 *
 * Layout: a fixed panel from the bottom edge of the site header to the bottom
 * of the viewport. It does not delete SharePoint's chrome — the class names are
 * not a public contract. Covering it only depends on the header existing, and
 * the header is measured.
 */

export interface IBiologyReaderChromeApplicationCustomizerProperties {
  /**
   * The page this may take over. Either site-relative
   * ('/SitePages/Biology.aspx') or absolute
   * ('/sites/HSStudents/SitePages/Biology.aspx').
   */
  targetPath?: string;
  /** The reader to frame. */
  readerUrl?: string;
  /** Element whose bottom edge the panel starts at. */
  headerSelector?: string;
  /** Stacking order. Must stay below the suite navigation (1000). */
  zIndex?: number;
  /** Set false to disable without unregistering. */
  enabled?: boolean;
  /** Log the match decision to the browser console. */
  debug?: boolean;
}

interface ISettings {
  targetPath: string;
  readerUrl: string;
  headerSelector: string;
  zIndex: number;
  enabled: boolean;
  debug: boolean;
}

const DEFAULTS = {
  targetPath: '/SitePages/Biology.aspx',
  readerUrl: 'https://dbbudd.github.io/biology/',
  headerSelector: '#spSiteHeader',
  zIndex: 800,
};

const PANEL_ID = 'biology-reader-panel';
const HEADER_RETRIES = 20;
const HEADER_RETRY_MS = 250;

const stripTrailingSlash = (value: string): string =>
  value.replace(/\/+$/, '');

export default class BiologyReaderChromeApplicationCustomizer extends BaseApplicationCustomizer<
  IBiologyReaderChromeApplicationCustomizerProperties
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

  /* ------------------------------ decide ------------------------------ */

  private get settings(): ISettings {
    const p: IBiologyReaderChromeApplicationCustomizerProperties = this.properties || {};
    return {
      targetPath: p.targetPath || DEFAULTS.targetPath,
      readerUrl: p.readerUrl || DEFAULTS.readerUrl,
      headerSelector: p.headerSelector || DEFAULTS.headerSelector,
      zIndex: typeof p.zIndex === 'number' ? p.zIndex : DEFAULTS.zIndex,
      enabled: p.enabled !== false,
      debug: p.debug === true,
    };
  }

  /**
   * True when this is the one page the extension is allowed to take over.
   *
   * targetPath may be absolute or site-relative; both are compared against the
   * site's own serverRelativeUrl so a renamed or moved site keeps working.
   */
  private isTargetPage(): boolean {
    const s = this.settings;
    if (!s.enabled) {
      return false;
    }

    // Never take over the editing canvas — there would be no way to undo it.
    if (/[?&]mode=edit(&|=|$)/i.test(window.location.search)) {
      return false;
    }

    const here = stripTrailingSlash(window.location.pathname.toLowerCase());
    const web = stripTrailingSlash(
      (this.context.pageContext.web.serverRelativeUrl || '').toLowerCase()
    );
    const target = stripTrailingSlash(s.targetPath.toLowerCase());

    const absolute = target.indexOf(web) === 0 && web.length > 0 ? target : web + target;
    return here === absolute;
  }

  private sync = (): void => {
    const matched = this.isTargetPage();

    if (this.settings.debug) {
      // The most common support question is "why did nothing happen", and the
      // answer is always that the path did not match.
      console.log('[BiologyReader]', {
        path: window.location.pathname,
        web: this.context.pageContext.web.serverRelativeUrl,
        target: this.settings.targetPath,
        matched: matched,
      });
    }

    if (matched) {
      if (!this.panel) {
        this.setup();
      } else {
        this.resize();
      }
    } else {
      this.teardown();
    }
  };

  /* ------------------------------ render ------------------------------ */

  private setup(): void {
    const readerUrl = this.settings.readerUrl;
    const zIndex = this.settings.zIndex;

    const stale = document.getElementById(PANEL_ID);
    if (stale && stale.parentNode) {
      stale.parentNode.removeChild(stale);
    }

    const panel = document.createElement('div');
    panel.id = PANEL_ID;
    panel.setAttribute('role', 'region');
    panel.setAttribute('aria-label', 'Biology course reader');
    panel.style.cssText = [
      'position:fixed',
      'left:0',
      'right:0',
      'bottom:0',
      'top:0',
      'z-index:' + zIndex,
      'background:#fff',
      'display:flex',
      'flex-direction:column',
      'margin:0',
      'padding:0',
      'box-sizing:border-box',
    ].join(';');

    const frame = document.createElement('iframe');
    frame.src = readerUrl;
    frame.title = 'Biology course reader';
    frame.setAttribute('loading', 'eager');
    frame.setAttribute('allow', 'fullscreen');
    frame.style.cssText = [
      'flex:1 1 auto',
      'width:100%',
      'height:100%',
      'border:0',
      'display:block',
      'background:#fff',
    ].join(';');

    panel.appendChild(frame);
    document.body.appendChild(panel);

    // The page underneath must not scroll, or two scrollbars fight each other.
    this.bodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    this.panel = panel;

    this.resizeHandler = (): void => {
      this.resize();
    };
    window.addEventListener('resize', this.resizeHandler);

    this.waitForHeader(HEADER_RETRIES);
  }

  /**
   * Measure once the header exists. SharePoint renders it after the extension
   * runs, so a single measurement at onInit would usually find nothing and
   * leave the panel covering the navigation.
   */
  private waitForHeader(remaining: number): void {
    if (!this.panel) {
      return;
    }

    const header = document.querySelector(this.settings.headerSelector);
    this.resize();

    if (header) {
      return;
    }

    if (remaining <= 0) {
      if (this.settings.debug) {
        console.warn(
          '[BiologyReader] header not found: ' + this.settings.headerSelector +
          ' — the panel is covering the site navigation'
        );
      }
      return;
    }

    this.headerTimer = window.setTimeout(
      (): void => {
        this.waitForHeader(remaining - 1);
      },
      HEADER_RETRY_MS
    );
  }

  /** Start the panel at the bottom edge of whatever chrome sits above it. */
  private resize(): void {
    if (!this.panel) {
      return;
    }

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
