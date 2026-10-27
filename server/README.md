# The change service

The four operations the teacher page calls. No dependencies, no framework —
`node server/http.mjs` is a complete running service.

```
POST /requests                  create a request and start a draft
GET  /requests                  this teacher's own requests, with status
GET  /requests/:id              one request
POST /requests/:id/corrections  pass the teacher's correction through
POST /requests/:id/complete     publish (alias: /publish)
GET  /health                    what is configured (never the token)
```

`GET /requests` returns a status in the teacher's vocabulary and nothing else:

| status | means |
| --- | --- |
| `requested` | the issue exists, nothing drafted yet |
| `drafting` | the agent has a draft open, checks not done |
| `ready` | the draft passed its checks; `canPublish` is true |
| `published` | merged, and therefore live |

Attribution comes from a `<!-- requested-by: … -->` marker written into the
issue body at creation. It is an HTML comment, so every parser in the repo
strips it before showing text, and the service can list "my requests" without
a database.

## Why this exists

The SPFx customizer cannot hold the GitHub credential: it is client-side
JavaScript, so anything in it is readable by everyone who can load the page.
This service is the layer that does, and it authenticates the caller so the
page never has to claim who it is.

## Run it locally

```bash
node server/http.mjs
```

Then:

```bash
curl -s localhost:7071/health
```

`/health` tells you what is wired up without ever echoing the token.

### Environment

| Variable | Purpose |
| --- | --- |
| `GITHUB_TOKEN` | fine-grained PAT or App installation token, repo-scoped, issues + pull requests write, actions write |
| `GITHUB_REPO` | `dbbudd/biology` |
| `COPILOT_ASSIGNEE` | login the agent is assignable as; discover with `GET /repos/{repo}/assignees` |
| `TEACHER_ROLE` | role a caller must hold. Unset allows any signed-in caller — right for a first run, wrong for real staff |
| `DEV_IDENTITY` | **local only.** Substitutes a named caller when there is no Entra principal. Never set this in production |
| `ALLOWED_ORIGIN` | CORS origin; the SharePoint site's origin |
| `GITHUB_API` | override for tests |

## Test it

```bash
node --test server/test/service.test.mjs
```

Twelve tests, no network. They pin the things that would be expensive to get
wrong in production:

- the issue body keeps the exact headings the parsers in this repo read
- the teacher's correction is passed through **verbatim** — paraphrasing into
  engineering language loses the intent
- publishing dispatches the commit the draft currently points at
- the approver is the **caller**, even when the body claims a different name
- a draft that changed after the teacher looked is refused
- nothing can publish twice, or publish with no draft
- every operation refuses an anonymous caller
- empty and oversized fields are rejected before GitHub is touched

## Deploy it

**Azure App Service** is the shortest path, because its built-in authentication
produces exactly the `x-ms-client-principal` header this service already reads:

1. Create a Linux Node 22 Web App, deploy this repo, start command
   `node server/http.mjs`
2. **Authentication → Add identity provider → Microsoft**, require
   authentication. This is what makes `x-ms-client-principal` appear and what
   guarantees the caller is a real signed-in user
3. App settings: `GITHUB_TOKEN`, `GITHUB_REPO`, `COPILOT_ASSIGNEE`,
   `TEACHER_ROLE`, `ALLOWED_ORIGIN`
4. Store `GITHUB_TOKEN` as a Key Vault reference rather than a plain setting

Azure Functions works too — the handlers in `service.mjs` are framework
agnostic, so the adapter is a thin file that maps requests onto them. Nothing
in the logic changes.

### The token

A **GitHub App** is better than a PAT: installation tokens expire in an hour,
cannot be used outside the installed repos, and the private key never leaves
Key Vault. A fine-grained PAT is acceptable to get started, scoped to this one
repository, with issues, pull-requests and actions write.

Whichever you use, its account must equal the repository variable
`PUBLISH_ACTOR` — `publish-draft.yml` refuses a dispatch from anyone else.

## Point the teacher page at it

The customizer takes `serviceUrl` and `serviceResource` as registration
properties, so no rebuild is needed:

```powershell
Set-PnPCustomAction -Identity ce93d2e6-350b-4ccf-b71c-cee0bb30cac2 -Scope Web `
  -ClientSideComponentProperties '{\"targetPath\":\"/SitePages/biology-changes.aspx\",\"serviceUrl\":\"https://your-app.azurewebsites.net\",\"serviceResource\":\"api://<app-registration-client-id>\"}'
```

With `serviceResource` set, the page calls it through `AadHttpClient`, which
attaches the signed-in user's Entra token — that is what makes `approved_by`
verifiable rather than asserted.

## Testing it from the browser, before Azure exists

The page runs on `https://hkis.sharepoint.com`, so a browser will refuse to
call `http://localhost` as mixed content. Two ways around it:

- **Test the API with `curl` first.** Everything except the UI can be proven
  that way, including against a real throwaway issue.
- **Serve the local service over HTTPS** using the SPFx dev certificate, and
  register `serviceUrl` as `https://localhost:7071`. The browser will warn
  about the self-signed certificate once; after that it behaves exactly like
  production.

## What is deliberately missing

- **No storage.** GitHub is the system of record; a second database of change
  requests would drift out of sync with it within a month.
- **No list endpoint.** The page reads the activity feed straight from the
  public GitHub API, so the service only handles writes and single reads.
- **No automatic publishing.** Publishing is an explicit call that names the
  caller as approver, and the workflow re-checks everything regardless.
