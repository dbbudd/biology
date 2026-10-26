import { override } from '@microsoft/decorators';
import { BaseApplicationCustomizer } from '@microsoft/sp-application-base';

/**
 * Full-facade wrapper for the Biology course reader.
 *
 * TARGETING
 * --------
 * This extension is registered across the whole site (RegistrationType: Web),
 * because that survives the page being renamed or moved. It therefore has to
 * refuse to do anything on every other page — see `isTargetPage()`. That guard
 * is the real scope, not the registration.
 *
 * LAYOUT
 * ------
 * It does not try to delete SharePoint's chrome. It lays one fixed panel over
 * the page canvas, starting at the bottom of the site header, so the site
 * navigation stays visible and usable exactly as it is. Deleting elements by
 * class name is the thing that breaks when Microsoft ships a UI change; a
 * panel positioned over them only breaks if the header itself moves, and the
 * header's position is measured rather than assumed.
 *
 * Cleanup matters more than setup here: an Application Customizer persists
 * across in-page navigation and is re-used, not re-created. If `dispose` leaks
 * a fixed panel, the teacher is stuck with a full-screen overlay on every
 * page they visit afterwards.
 */

export interface IBiologyReaderChromeApplicationCustomizerProperties {
  /** The one page this is allowed to take over. Path only, no origin. */
  targetPath?: string;
  /** The reader to frame. */
  readerUrl?: string;
  /** Element whose bottom edge the panel starts at. Defaults to the site header. */
  headerSelector?: string;
  /** Stacking order. Keep below the suite navigation (1000) so nav stays clickable. */
  zIndex?: number;
  /** Set false to leave the harness in place but blank, for troubleshooting. */
  enabled?: boolean;
  /** Log the mount decision to the browser console. */
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
  targetPath: '/sites/HSStudents/SitePages/Biology.aspx',
  readerUrl: 'https://dbbudd.github.io/biology/',
  headerSelector: '#spSiteHeader',
  zIndex: 800,
};

const PANEL_ID = 'biology-reader-panel';

export default class BiologyReaderChromeApplicationCustomizer extends BaseApplicationCustomizer<
  IBiologyReaderChromeApplicationCustomizerProperties
> {
  private panel: HTMLDivElement | undefined;
  private bodyOverflow: string | undefined;
  private resizeHandler: (() => void) | undefined;

  @override
  public onInit(): Promise<void> {
    this.context.application.navigatedEvent.add(this, this.onNavigated);
    this.sync();
    return Promise.resolve();
  }

  @override
  public onDispose(): void {
    this.context.application.navigatedEvent.remove(this, this.onNavigated);
    this.teardown();
  }

  private readonly onNavigated = (): void => {
    // SPFx reuses this instance for in-page navigation, so the decision has to
    // be re-made rather than remembered.
    this.sync();
  };

  /* ------------------------------ decide ------------------------------ */

  /**
   * Properties are optional in the registration JSON, so every one of them has
   * a default. A missing property must never mean "crash on the wrong page".
   */
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

  /** Normalise a path for comparison: no query, no hash, no trailing slash, lowercase. */
  private static normalise(pathname: string): string {
    let p = pathname.split('?')[0].split('#')[0].toLowerCase();
    // SharePoint serves the root as "/" and the page as ".../Biology.aspx".
    if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
    return p;
  }

  private isTargetPage(): boolean {
    const { targetPath, enabled } = this.settings;
    if (!enabled) return false;

    // Editing experience: never take the page over, or nobody can undo it.
    const search = window.location.search.toLowerCase();
    if (search.indexOf('mode=edit') !== -1) return false;

    return BiologyReaderChromeApplicationCustomizer.normalise(window.location.pathname)
      === BiologyReaderChromeApplicationCustomizer.normalise(targetPath);
  }

  private sync(): void {
    if (this.settings.debug) {
      // The most common support question is "why did nothing happen", and the
      // answer is always that the path did not match.
      console.log('[BiologyReader]', {
        path: window.location.pathname,
        target: this.settings.targetPath,
        matched: this.isTargetPage(),
      });
    }

    if (this.isTargetPage()) {
      if (!this.panel) this.setup();
      else this.resize();
    } else {
      this.teardown();
    }
  }

  /* ------------------------------ render ------------------------------ */

  private setup(): void {
    const { readerUrl, headerSelector, zIndex } = this.settings;

    // Remove a stale panel left by a previous instance (e.g. after a page
    // reload that somehow skipped dispose). Cheaper than debugging it later.
    const stale = document.getElementById(PANEL_ID);
    if (stale && stale.parentNode) stale.parentNode.removeChild(stale);

    const panel = document.createElement('div');
    panel.id = PANEL_ID;
    panel.setAttribute('role', 'region');
    panel.setAttribute('aria-label', 'Biology course reader');
    panel.style.cssText = [
      'position:fixed',
      'left:0',
      'right:0',
      'bottom:0',
      `z-index:${zIndex}`,
      'background:var(--bodyBackground,#fff)',
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

    // The page underneath must not scroll; otherwise two scrollbars fight.
    this.bodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    this.panel = panel;

    this.resizeHandler = (): void => this.resize();
    window.addEventListener('resize', this.resizeHandler);
    // The header height changes when the tenant switches between compact and
    // full navigation, which is not a window resize.
    this.context.application.navigatedEvent.add(this, this.resizeHandler);

    this.resize();
  }

  /** Start the panel at the bottom edge of whatever chrome sits above it. */
  private resize(): void {
    if (!this.panel) {
      return;
    }
    const { headerSelector } = this.settings;

    let top = 0;
    const header = document.querySelector(headerSelector);
    if (header) {
      const rect = header.getBoundingClientRect();
      top = Math.max(0, Math.round(rect.bottom));
    }

    this.panel.style.top = `${top}px`;
  }

  private teardown(): void {
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
      this.context.application.navigatedEvent.remove(this, this.resizeHandler);
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
