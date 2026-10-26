# Where the GitHub token can live

Short answer: **not in an SPFx customizer.** SPFx is client-side JavaScript. A
customisation runs in every user's browser, and anyone who can load the page
can read the whole bundle from DevTools — including any token in it. Restricting
the page to teachers doesn't help: it only means teachers can read it, and a
token that grants write access to the course repository must not be readable by
39 people.

That doesn't sink the idea. The interface belongs in SharePoint; the secret
belongs one layer down.

## The split

```
teacher's browser
  │
  ├─ page: SharePoint site page (teacher-gated)
  │    └─ SPFx customizer ── the interface: form, my requests, publish button
  │
  │  fetch with the user's own Entra token (AadHttpClient)
  ▼
Azure Function  ── holds nothing secret in code
  │  · validates the caller is in the "Course Editors" group
  │  · reads the GitHub credential from Key Vault
  │  · mints a short-lived installation token from the GitHub App
  ▼
GitHub API
```

Three properties this buys, none of which a browser-held token can give:

1. **The secret never leaves the server.** Key Vault, rotated, audited.
2. **The caller is verifiable.** The function knows the Entra object ID of the
   person who pressed publish. `approved_by` stops being a claim from a chat
   and becomes an identity proven by a signed token.
3. **Authorisation is enforced server-side.** Group membership is checked
   where a user cannot edit it, not by hiding a button.

Point 2 is the significant one for the design we already built. Every other
part of the workflow had to take the approver's name on trust; this is the one
place where that becomes a fact.

## Two ways to build the layer

| | Azure Function | Power Automate |
| --- | --- | --- |
| Secret storage | Key Vault, or app secret | secure input / Key Vault |
| Version controlled | yes — code in the repo | no — lives in the tenant |
| Testable | yes | by hand |
| Identity check | Entra token + group claim | connection owner, weaker |
| Extra infrastructure | Function App, Key Vault, app registration | none |
| Time to first working call | half a day | an hour |

If Azure is already available to you, the function is the better long-term
home and the one where the code can live beside the site. If it isn't, Power
Automate gets you working sooner and can be replaced later without the
interface changing — the customizer only knows about four endpoints.

## The function

Four routes, mirroring [AGENT-CONTRACT.md](../AGENT-CONTRACT.md). Node on
Functions v4, ~150 lines.

| Route | Purpose |
| --- | --- |
| `POST /requests` | create the issue from the teacher's brief |
| `GET /requests/{id}` | status + the draft summary comment |
| `POST /requests/{id}/corrections` | pass the teacher's correction through as `@copilot …` |
| `POST /requests/{id}/publish` | verify head SHA, dispatch `publish-draft.yml` |

Each one:

1. Reads the caller from `x-ms-client-principal` (Functions sets this for
   Entra-authenticated calls) or validates the bearer token.
2. Rejects if the caller is not in the editors group. Return 403 with a plain
   message; the customizer shows it.
3. Never accepts a repository, branch or PR number from the client. Those are
   configuration on the server.
4. Rate-limits per user — a publish loop is cheap to write by accident.

## The customizer

A second web part, on a separate page — `SitePages/CourseRequests.aspx` — is a
good shape. It is a different job from the reader: a form, a list of your
requests with their state, and a publish button. Keep it out of the reader's
customizer so neither can break the other.

It needs the function's URL and nothing else:

```ts
// AadHttpClient, not fetch — the user's Entra token is attached for you
const client = await this.context.aadHttpClientFactory.getClient(
  'api://<function-app-client-id>'
);
const res = await client.post(`${this.functionUrl}/requests`, AadHttpClient.configurations.v1, {
  body: JSON.stringify({ chapter, change, doneWhen }),
  headers: { 'Content-Type': 'application/json' },
});
```

### One more admin ask

Calling a custom Entra-protected API from SPFx requires a permission request in
`package-solution.json`:

```json
"webApiPermissionRequests": [
  { "resource": "<function-app-name>", "scope": "user_impersonation" }
]
```

and a tenant administrator to approve it in the SharePoint admin centre. Add
this to the list you're giving your admin, alongside the app catalog.

## What not to do

- **A token in the customizer**, obfuscated, base64'd or "encrypted" — it is
  decryptable in the browser by design.
- **A token in a SharePoint list or web part property.** Same problem: it is
  readable through the REST API by anyone with site access.
- **A PAT on the server when a GitHub App is possible.** A GitHub App's
  installation tokens expire in an hour and cannot be used outside the repos
  you installed it on; a PAT is long-lived and usually over-scoped.
- **Trusting the customizer's claim about who is asking.** If the function
  takes `approved_by` from the request body, the identity work was wasted.

## Relationship to the chat plan

This does not replace the chat; it replaces *where the chat's actions go*.
Once the function exists, both the chat and the customizer call the same four
endpoints, and the trust model is identical: a verified Entra identity, a
server-side secret, and a publish that names who approved it.

That ordering is worth considering: build the function and the customizer
first — it needs no Copilot Studio capacity, it gives teachers a working
interface today, and the chat can then be added as a second front end rather
than the only one.
