# Wrapping the reader in a full-page SPFx web part

Target page: `https://hkis.sharepoint.com/sites/HSStudents/SitePages/Biology.aspx`

This is a change to a web part you already have, not a new project. It is
deliberately not scaffolded here: you have the SPFx toolchain and I do not,
so hand-written `package.json` version tables would be guesswork. What
follows is the part that is specific to this reader.

## 1. Manifest — two lines

`src/webparts/<yourWebPart>/<YourWebPart>.manifest.json`

```json
{
  "$schema": "https://developer.microsoft.com/json-schemas/spfx/client-side-web-part-manifest.schema.json",
  "id": "…",
  "alias": "BiologyReaderWebPart",
  "componentType": "WebPart",
  "version": "*",
  "manifestVersion": 2,
  "requiresCustomScript": false,
  "supportedHosts": ["SharePointWebPart", "SharePointFullPage"],
  "preconfiguredEntries": [ … ]
}
```

- `SharePointFullPage` is what makes it eligible for a single part app page.
- `requiresCustomScript: false` means it still works on a site collection with
  custom script switched off. Keep it false; nothing here needs it.

## 2. The web part

The whole job is: fill the container, and keep filling it when the window
changes. Two details matter and both are easy to get wrong.

```tsx
// BiologyReader.tsx
import * as React from 'react';
import styles from './BiologyReader.module.scss';

const READER_URL = 'https://dbbudd.github.io/biology/';

export default function BiologyReader(): JSX.Element {
  const holder = React.useRef<HTMLDivElement>(null);
  const frame = React.useRef<HTMLIFrameElement>(null);

  React.useEffect(() => {
    const el = holder.current;
    const f = frame.current;
    if (!el || !f) return;

    // Do NOT use 100vh. The suite navigation and the page's own padding sit
    // outside this container, so a 100vh frame always overflows by exactly
    // the height of the nav — and the reader grows an inner scrollbar it
    // should not have.
    const fit = () => {
      f.style.height = `${el.clientHeight}px`;
    };

    const ro = new ResizeObserver(fit);
    ro.observe(el);
    fit();

    return () => ro.disconnect();
  }, []);

  return (
    <div ref={holder} className={styles.holder}>
      <iframe
        ref={frame}
        className={styles.frame}
        src={READER_URL}
        title="Biology course reader"
        // A web part is trusted code, so this frame is not governed by the
        // site's HTML Field Security embed allowlist.
        allow="fullscreen"
        loading="eager"
      />
    </div>
  );
}
```

```scss
/* BiologyReader.module.scss */
.holder {
  position: relative;
  width: 100%;
  /* Fallback for the moment before the observer runs. */
  min-height: calc(100vh - 160px);
}

.frame {
  display: block;
  width: 100%;
  border: 0;
}
```

A note on the fallback: the `min-height` is a guess at the chrome height and
will be slightly wrong on mobile. It only applies for the first frame, then
the observer corrects it. Do not tune it — leave it generous.

## 3. Getting the full facade

Your instinct is right: upload the `.sppkg`, add the web part to
`Biology.aspx`. That is the deployment. The two PowerShell lines below are
**not** deployment — `Connect-PnPOnline` just signs PowerShell in, and
`Set-PnPPage` changes one property of one page: its layout type. Nothing is
installed, nothing is uploaded.

That single property is the difference between these two outcomes:

| | Web part added to a normal page | Same web part on a *single part app page* |
| --- | --- | --- |
| Page title | shown | gone |
| Command bar / Edit | shown | gone |
| Content width | max-width column, section padding | full width |
| Can a teacher rearrange it | yes | no — layout is locked |
| Reached by | the page UI | the page UI, or PnP |

So: if a web part in a normal section is good enough, skip this section
entirely. If you want it to look like an application, one of these.

**Route A — change the layout (recommended).** One property, reversible,
nothing hidden with CSS:

```powershell
Connect-PnPOnline -Url https://hkis.sharepoint.com/sites/HSStudents
Set-PnPPage -Identity "Biology" -LayoutType SingleWebPartAppPage
```

Convert back at any time with `-LayoutType Article`. Converted pages keep
their URL, so links already shared keep working. Remove every other web part
first — a single part app page holds exactly one and cannot be edited in the
browser afterwards.

Some tenants also offer this as a page template when you create a page
(**New → Page** and pick the single part app layout). If yours does, you do
not need the PowerShell at all.

**Route B — an Application Customizer** (the "template" pattern). This is a
different kind of component, and it is what spreads across a whole site. See
§5 for scoping it to one page. Use it only if you want to keep one codebase
with your other components; it requires hiding SharePoint's chrome with
injected CSS, which is unsupported and breaks when Microsoft changes the UI.

**Route C — full-width section only.** No code change: put the web part in a
full-width section and hide the page title. Cheapest, but the suite nav and
command bar stay, and the reader's own toolbar then duplicates them.

## 4. Deploy

1. `gulp bundle --ship && gulp package-solution --ship`
2. Upload the `.sppkg` to the app catalog.
3. **Approve it** — a SharePoint administrator approves apps uploaded to the
   tenant catalog. A site catalog may need no approval, but the app must be
   added to the site.
4. Add the web part to the page (or PnP it in once the layout is locked).

If the catalog is the *tenant* catalog the web part is available on every
site; if it is a *site* catalog, `HSStudents` must be that site.

Either way, **the web part only appears where you add it.** A web part is
inherently scoped to one page. Nothing here will touch any other page in the
site — if your other components appear everywhere, they are Application
Customizers, not web parts, and §5 is about them.

## 5. If you use an Application Customizer instead — scoping it to one page

An Application Customizer registered at **Web** scope runs on every page in
the site. That is the "template over everything" behaviour. There are two
ways to restrict it to `Biology.aspx`.

**Lever 1 — register it against a file.** In the
`ClientSideInstance.xml`/PnP custom action, use `RegistrationType: File` and
`RegistrationId: SitePages/Biology.aspx`. SharePoint then only runs it on
that page. Downsides: rename or move the page and the registration silently
stops matching; you maintain a registration per page.

```xml
<CustomAction
  Title="Biology Reader"
  Location="ClientSideExtension.ApplicationCustomizer"
  RegistrationType="File"
  RegistrationId="SitePages/Biology.aspx"
  ClientSideComponentId="…"
  ClientSideComponentProperties="{&quot;targetPath&quot;:&quot;/sites/HSStudents/SitePages/Biology.aspx&quot;}" />
```

**Lever 2 — register at Web scope, refuse to render elsewhere.** The
component reads `window.location.pathname` and returns without mounting unless
it matches. Survives page renames, one registration, and the check is visible
in code rather than in tenant configuration. The cost is that the extension
still downloads on every page — a few KB — even when it does nothing.

```ts
this.context.application.navigatedEvent.add(this, this.onNavigate);

private render(): void {
  const target = this.properties.targetPath || '/sites/HSStudents/SitePages/Biology.aspx';
  const here = window.location.pathname.replace(/\.aspx$/i, '.aspx');
  if (here.toLowerCase() !== target.toLowerCase()) return; // do nothing, on purpose
  // …mount the full-screen frame
}
```

Lever 2 is usually the better one. Whichever you pick, hiding the site header
needs injected CSS, and that is the part that breaks: the class names are not
a public contract.

## 6. Optional: make the back button behave

The reader is 47 separate pages inside one frame, so browser Back currently
walks the iframe's history invisibly. To fix it, the reader posts its location
out and the web part mirrors it into the page URL.

**Reader side** — `assets/course.js`, owner territory, and it must not break
the reader when it is *not* framed:

```js
if (window.parent !== window) {
    window.parent.postMessage({ type: 'biology:location', path: location.pathname + location.hash }, '*');
}
const go = (path) => { window.parent !== window
    ? window.parent.postMessage({ type: 'biology:navigate', path }, '*')
    : (location.href = path); };
```

**Web part side:**

```tsx
React.useEffect(() => {
  const onMessage = (e: MessageEvent) => {
    if (e.data?.type !== 'biology:location') return;
    history.replaceState(null, '', `${location.pathname}${location.search}#${e.data.path}`);
  };
  window.addEventListener('message', onMessage);
  return () => window.removeEventListener('message', onMessage);
}, []);
```

Skip this until the basic frame works. It is polish, and it is the part most
likely to introduce a bug.

## 7. What this does not fix

- **Nested scrolling.** A keyboard user tabs into a scrollable region inside a
  scrollable page. The Embed web part has the same flaw; only serving the
  reader as a native web part would avoid it.
- **Partitioned storage.** The reader keeps reading progress in
  `localStorage`; inside a frame on `hkis.sharepoint.com` that storage is
  partitioned by the top-level site. Progress persists for a reader who only
  ever uses the SharePoint page, and does not carry over to
  `dbbudd.github.io` directly.
- **Printing.** `printout.html` will print the frame, not the chapter. Tell
  teachers to open the reader in a new tab to print.
