# hkis-biology-reader

SPFx Application Customizer that frames the Biology course reader across
`/sites/HSStudents/SitePages/Biology.aspx` and does nothing anywhere else.

Built to match the `hkis-handbook` solution: SPFx 1.23.0, gulp 4, Node 22, and
the custom action provisioned **by the package** rather than by a PnP script.

## What it does

```
┌─────────────────────────────────────────┐
│ site header / navigation (untouched)    │
├─────────────────────────────────────────┤
│                                         │
│   fixed panel, measured from the        │
│   bottom of the header to the           │
│   bottom of the viewport                │
│   ┌───────────────────────────────────┐ │
│   │ iframe: dbbudd.github.io/biology  │ │
│   └───────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

It does not delete SharePoint's chrome. Deleting by CSS class name is what
breaks on a UI update; covering it only depends on the header being there, and
the header is measured at runtime.

## Why the guard, not the registration

The custom action is registered on the web (`elements.xml`), with no
`RegistrationType`. So it runs on every page in the site and refuses to render
except where `isTargetPage()` says yes.

That is deliberate. A `RegistrationType="File"` registration stops matching the
moment somebody renames the page, and the failure is silent. A runtime guard
survives renames, and its decision is printed to the console with `debug: true`.

The guard compares the current path against `pageContext.web.serverRelativeUrl`,
so it also survives the *site* being renamed or moved.

## Build

Node 22 is required — SPFx 1.23 refuses to build on 24.

```bash
nvm use 22
npm install
npm run build                 # gulp bundle
npm run package               # bundle --ship && package-solution --ship
```

Output: `sharepoint/solution/hkis-biology-reader.sppkg`.

## Deploy

1. Upload the `.sppkg` to the app catalog.
2. Approve it (tenant admins see a queue; site catalogs may not need this).
3. **Add the app to `HSStudents`.** With `skipFeatureDeployment: true` the app
   is not deployed tenant-wide, so it must be added to the site; that is what
   activates the feature and provisions the custom action.
4. Open `https://hkis.sharepoint.com/sites/HSStudents/SitePages/Biology.aspx`
   with a hard refresh.

## Change the settings

The properties live in `sharepoint/assets/elements.xml` and
`ClientSideInstance.xml`, so changing them means a rebuild and redeploy:

```json
{
  "targetPath": "/SitePages/Biology.aspx",
  "readerUrl": "https://dbbudd.github.io/biology/",
  "headerSelector": "#spSiteHeader",
  "zIndex": 800,
  "enabled": true,
  "debug": false
}
```

To change them without rebuilding, use PnP:

```powershell
Connect-PnPOnline -Url https://hkis.sharepoint.com/sites/HSStudents -Interactive
Get-PnPCustomAction -Scope Web | Format-List Title, ClientSideComponentId, ClientSideComponentProperties
```

| Property | When you would change it |
| --- | --- |
| `targetPath` | The page moves, or a second page should use the same app |
| `readerUrl` | Hosting changes, or you point at a branch build |
| `headerSelector` | Your header is not `#spSiteHeader` — otherwise the panel starts at 0 and covers the nav |
| `zIndex` | Nav unclickable: it is above 1000. 800 is correct |
| `enabled` | Turn it off without unregistering |
| `debug` | Print the match decision to the console |

## Verify

1. Site navigation still works — it is above the panel, not inside it.
2. Exactly one panel. Two means a duplicate custom action
   (`Get-PnPCustomAction -Scope Web`).
3. No gap under the header, no double scrollbar.
4. **Open another page in the site.** The panel must be gone. This is the check
   that matters; the guard is the only thing keeping it off other pages.
5. Resize the window, and check a narrow viewport — the header changes height.

## When it goes wrong

| Symptom | Cause |
| --- | --- |
| Nothing on the page | path mismatch — set `debug: true`, compare `path` / `web` / `target` in the console |
| Panel over every page | `targetPath` never matches, so check it is a path, not a URL with the origin on it |
| Nav not clickable | `zIndex` above the suite nav |
| Gap under header, or panel starts too low | `headerSelector` wrong; inspect the header element and use its id |
| Reader short and centred | header not found, so `top` stayed 0 and the panel covers the header |
| Works for you, not for teachers | app not approved, or not added to the site |

## Local development

```bash
gulp serve --nobrowser
```

`config/serve.json` points at the Biology page with `debug: true` and
`targetPath` set, so the extension loads from localhost without being deployed.

## Limits

- **It is an iframe.** Keyboard users tab into a scrollable region inside a
  scrollable page. Only a native rewrite avoids that.
- **Reading progress is partitioned** — the reader's `localStorage` inside a
  `sharepoint.com` frame is separate from direct visits to the GitHub Pages
  site.
- **Printing prints the frame**, not the chapter. `printout.html` needs its own
  tab.
- **Browser Back** walks the iframe's history invisibly; fixing it needs a
  `postMessage` handshake from the reader.
