# Biology reader chrome — SPFx Application Customizer

Takes over `https://hkis.sharepoint.com/sites/HSStudents/SitePages/Biology.aspx`
and leaves every other page in the site untouched. Site navigation above the
reader, nothing else.

```
sharepoint/biology-reader-chrome/
  src/extensions/biologyReaderChrome/
    BiologyReaderChromeApplicationCustomizer.manifest.json
    BiologyReaderChromeApplicationCustomizer.ts
  provisioning/
    register.ps1          one command to register it
    unregister.md         one command to back it out
```

## What it actually does

It does **not** delete SharePoint's chrome. It lays one fixed panel over the
page canvas, starting at the bottom edge of the site header, and puts the
reader's iframe inside it.

That choice is deliberate. Deleting elements by CSS class name is the
technique that breaks when Microsoft ships a UI change — the class names are
not a public contract. A panel positioned over them only breaks if the header
moves, and the header's position is measured at runtime, not assumed.

Three consequences worth knowing before you deploy:

- **Site-wide registration, page-level guard.** The custom action is registered
  on the web so it survives the page being renamed; the component then refuses
  to render unless `window.location.pathname` matches `targetPath`. The guard
  is the scope — the registration is not.
- **Editing mode is refused.** If the URL contains `Mode=Edit` the component
  does nothing, otherwise it would cover the page you are trying to edit.
- **Teardown is the hard part.** An Application Customizer is reused across
  in-page navigation, not re-created. If `dispose` leaked the fixed panel, it
  would follow the user to every subsequent page. `teardown()` removes the
  panel, the resize listener, and restores `body.overflow`.

## Add it to your solution

This is not a scaffolded project — version tables written blind would be
guesswork. Copy the two files into the solution that already builds your other
components:

```
src/extensions/biologyReaderChrome/…
```

then `gulp serve --nobrowser`, or package as usual:

```powershell
gulp bundle --ship
gulp package-solution --ship
```

Upload `sharepoint/solution/*.sppkg` to the app catalog and approve it.

The manifest needs nothing beyond what is in it — an Application Customizer
does not use `supportedHosts`, and `requiresCustomScript: false` keeps it
working on a site collection with custom script switched off.

## Register it

```powershell
# every page, with the component guarding for one
./provisioning/register.ps1

# or: only the file, and rely on SharePoint rather than the guard
./provisioning/register.ps1 -FileScope

# troubleshoot with the browser console open
./provisioning/register.ps1 -Debug
```

The registration carries its configuration, so you do not have to rebuild the
package to change a setting:

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

| Property | Why you would change it |
| --- | --- |
| `targetPath` | The page moves, or you want a second page using the same app |
| `readerUrl` | You switch hosting, or want to point at a branch preview |
| `headerSelector` | Your site header is not `#spSiteHeader` — the panel then starts at 0, covering the nav |
| `zIndex` | The panel sits above the nav, so the nav stops responding. Lower it under 1000 |
| `enabled` | Turns it off without unregistering |
| `debug` | Logs the match decision to the console |

## Verify

Open the page with a hard refresh (`Ctrl+Shift+R` — an old bundle will be
cached) and check, in order:

1. **Site navigation still works.** It is above the panel, not inside it.
2. **Exactly one panel.** Two means a duplicate custom action — see
   `unregister.md`.
3. **The reader fills the height**, with no gap under the header and no double
   scrollbar.
4. **Navigate to another page in the same site** (a document library, the home
   page). The panel must be gone. This is the check that matters most, because
   the guard is what keeps the extension off other pages.
5. **Resize the window** from wide to narrow. The panel should re-measure, and
   on a tenant with compact navigation the header changes height.

## When it goes wrong

| Symptom | Cause |
| --- | --- |
| Nothing happens on the page | path mismatch. Register with `-Debug`, open the console, compare `path` and `target` |
| Panel over every page | `targetPath` is not matching, so the guard returns false everywhere… check it is a path, not a full URL |
| Nav is not clickable | `zIndex` is above the suite nav. Use 800, not 9999 |
| Gap under the header, or it starts too low | `headerSelector` does not match. Inspect the header element and use its id |
| Reader appears but is short | the header element was not found, so `top` is 0 and the panel covers the header; check the selector |
| Works for you, not for teachers | tenant CDN or caching — check the app is approved and enabled for the site |

## Limits — say these out loud before rollout

- **It is still an iframe.** Keyboard users tab into a scrollable region inside
  a scrollable page. This is inherent to keeping the reader a separate static
  site; a native rewrite is the only fix.
- **Reading progress is partitioned.** The reader stores progress in
  `localStorage`; inside a frame served from `sharepoint.com` that storage is
  separated from `dbbudd.github.io`. Progress persists for a reader who only
  uses the SharePoint page.
- **Printing prints the frame, not the chapter.** `printout.html` needs its
  own tab.
- **Browser Back** walks the iframe's history invisibly. Fixing it needs
  cooperation from the reader — see §6 of `../SPFX-WRAPPER.md`.
