# Teacher publishing system — what exists, what works, and the options

Written to be read cold, and to be argued with. It records what was built, what
was verified, what is still assumption, and the one decision that shapes
everything else.

State as of 27 October 2026.

---

## 1. The problem

Teachers want to change the text of a biology course reader. The reader is a
static site published from GitHub. Every content change is therefore a commit.
The goal was to let a biology teacher describe a change in plain language, see
a draft, approve it, and have it go live — **without learning git, branches,
pull requests or GitHub**.

A second, harder constraint emerged later: the school wants as little new
infrastructure as possible. No Azure if avoidable. SharePoint only where it is
already the right tool.

---

## 2. What is running today

| Piece | Where | Status |
|---|---|---|
| Course reader (47 chapters, simulations) | `dbbudd.github.io/biology` | **Live** |
| Change log page | `dbbudd.github.io/biology/reference/changelog.html` | **Live** |
| Reader inside SharePoint, full-page | `Biology.aspx` | **Live** — deployed as an SPFx customizer, version 1.4+ |
| Teacher page (`biology-changes.aspx`) | SPFx customizer in package 1.7.0.0 | **Built, page not yet created** |
| Issue form, labels, PR template | repository | **Live** |
| Content checks (links, TOC counts, spelling ratchet, path allowlist) | GitHub Actions | **Live**, passing |
| Draft review comment (before/after, generated from the diff) | GitHub Actions | **Live** — used on the first real change |
| Publish workflow with trust gate | GitHub Actions | **Live**, not yet exercised |
| Agent persona + repo instructions | `.github/agents`, `.github/copilot-instructions.md` | **Live** |
| Change service (Node, 4 endpoints, 20 tests) | `server/` | **Code complete, not deployed** |

The first real change went through the whole loop on 26 October: a teacher
requested a definition in chapter 2.3, Copilot opened a pull request, the review
comment showed the before/after, it was merged, and the page went live about a
minute later. That was done manually, by the repo owner.

---

## 3. The one constraint that decides everything

**Reading GitHub is anonymous. Writing to GitHub is not.**

- Anyone can read this repository's issues, pull requests and commits from a
  browser with no account. The change log and the teacher page rely on that.
- Creating an issue, commenting on a pull request, or triggering a workflow
  requires a GitHub identity: a signed-in session, an OAuth token, or a personal
  access token.

Microsoft and Google accounts do not help. GitHub only accepts GitHub
identities. A teacher signed into SharePoint with an HKIS account is, to GitHub,
anonymous.

So every design has to answer one question: **where does the GitHub credential
live, and who has to be logged in?**

There are only three answers:

| Credential lives in | Teachers need GitHub accounts | Token visible to page visitors | New infrastructure |
| --- | --- | --- | --- |
| The teacher's own GitHub login | **yes** | no | none |
| The customizer's JavaScript | no | **yes** | none |
| A server (Power Automate / Azure) | no | no | yes |

Everything else — the agent, the checks, the review, the publish gate, the
change log — is already built and works identically in all three.

---

## 4. What was built, and why each piece exists

### 4.1 Reader and chrome

An SPFx customizer frames the reader across `Biology.aspx`, hiding SharePoint's
site header while keeping the suite bar (`chromeMode: 'header'`). Selectors
came from the existing handbook project rather than guesswork, including a
prefix match on `shyHeader` because SharePoint hashes those class names.

**Verified:** deployed and working. Hiding is scoped by a body class, so other
pages in the site are unaffected.

### 4.2 Change log

`reference/changelog.html` reads the public GitHub API in the browser and shows
requests, drafts and published changes in teacher language. It survived a real
security review: an untrusted author could copy the issue form's headings and
appear in the log, so entries now require either the `change-request` label
(applying a label needs write access) or a trusted author association. Six cases
tested.

### 4.3 Content checks

`scripts/check-content.js` runs on every pull request: the table of contents and
the files agree, `sections` matches the `[data-track]` count, links resolve, no
hard-coded colours, American spelling as a ratchet (a file may not get *worse*),
and — most importantly — **only `chapters/` and `assets/toc.js` may change**.

That path check is the structural guarantee that a teacher's request cannot
touch the reading shell, the simulations or the workflows.

### 4.4 Draft review

Every pull request gets one comment, kept up to date, containing the before/after
sentences **generated from the diff** — not the agent's description of its own
work. When the two disagree, that gap is the thing worth noticing. The same
summary is mirrored onto the issue so a request lives in one thread.

### 4.5 Publish gate

`publish-draft.yml` publishes on a workflow dispatch, and:

1. only runs for the account named in the repository variable `PUBLISH_ACTOR`
2. verifies the commit being published is the one the approver saw
3. refuses anything outside the content allowlist
4. re-runs the checks against that exact commit
5. records an approving review naming the approver
6. merges, or asks for auto-merge if checks are still running
7. asks Pages to rebuild

The path that does not come from the chat keeps the `approved` label as a
maintainer-only fallback.

### 4.6 Change service

`server/` — Node, no dependencies, four operations: create a request, list a
teacher's requests with status and progress, pass a correction through, publish.
Twenty tests, no network.

Two rules are enforced by tests:

- **The approver is the authenticated caller, never a field in the request
  body.**
- **The published commit is pinned server-side** from the pull request's current
  head, so "publish what the teacher is looking at" is decided in one place.

**Not deployed.** Nothing calls it yet.

---

## 5. Options for the teacher's entry point

### Option A — prefilled GitHub issue form

A **New issue** button opens GitHub with the title, body headings and
`change-request` label pre-filled.

- Teachers need a GitHub account, once per person.
- No secrets, no infrastructure, no server.
- Actions does everything after: the label triggers the agent, checks run, the
  review comment appears.

**Cost:** this is the "teach faculty GitHub" that the project originally set out
to avoid — though a prefilled form is a much smaller ask than learning git.

### Option B — token inside the SPFx customizer

The page posts the issue directly with a fine-grained token scoped to
`issues: write` on this one repository.

- Teachers never see GitHub.
- No infrastructure.
- **The token is public.** Anyone who loads the page can read it and create
  issues. It cannot touch code, workflows or settings — its blast radius is
  spam issues, and possibly wasted Copilot credits if drafts are auto-started.

### Option C — Power Automate (or Azure)

A flow or function holds the token; the page calls it.

- No teacher accounts, no public token.
- Power Automate is already licensed; Azure is not needed if PA is used.
- **CORS is a real problem:** Power Automate's HTTP trigger does not answer
  browser preflight requests, so the page cannot call it directly from
  SharePoint. The workable no-Azure variant is Microsoft Forms → Power Automate:
  a form for submitting, a form for publishing, and the page as a read-only
  status board.

### Option D — status board only

The page shows a teacher's own requests, their status and progress trail, read
from the public API. No writes at all. This is required in every option, and it
works today.

---

## 6. The second decision: who approves a publication

Independent of the entry point, somebody has to decide that a draft is good
enough to be live. Two models:

**Model 1 — a human approves.** The teacher (or a course owner) presses Publish.
Requires an authenticated write: their GitHub login, or a server. Keeps a person
between the agent and a student-facing page.

**Model 2 — the submission is the approval.** The teacher's request authorises
the change; the automated checks are the only gate; the pull request merges when
it is green. No publish write exists at all, which is what makes Option B viable
without a server.

**The cost of Model 2 is specific and worth stating plainly:** an agent draft
that passes the automated checks would go live **without anyone reading it for
scientific accuracy**. That is the one check nothing in this system automates.
A ten-minute delay before auto-merge is a crude mitigation that costs nothing
and catches a watching teacher.

---

## 7. What was verified, and what is still assumption

For a second opinion, this is the useful list.

**Verified by running it:**

- The reader deploys and renders inside SharePoint, with chrome modes working
- GitHub refuses to be framed (`x-frame-options: deny`), so an iframe of the
  new-issue page is impossible
- The change log renders correctly from live GitHub data
- A full change went from issue to live page
- The content checks catch real regressions (broken link, section-count drift,
  new British spelling, edits outside the allowlist)
- 20 service tests pass; the server starts, refuses anonymous writes, returns
  teacher-readable errors on GitHub failures
- The publish workflow's shell blocks all parse; the package builds clean at
  1.7.0.0 with both customizers

**Assumption, not verified:**

- **Assigning Copilot to an issue from a workflow or token.** Community reports
  say the plain REST call fails; GitHub's own agentic-workflows project documents
  `assign-to-agent` as needing a fine-grained PAT. **Not tested in this tenant.**
  Everything downstream assumes a machine can start the agent; if it cannot, a
  human clicks Assign per draft, which is 30 seconds of human time.
- The `PUBLISH_ACTOR` dispatch path has never run end to end
- The change service has never called the real GitHub API
- Copilot credit consumption: **~4 credits per draft measured** against an
  allowance of 1,500/month on the education licence, i.e. comfortably inside it

---

## 8. Risks, honestly

| Risk | Likelihood | Mitigation |
|---|---|---|
| Agent edits text that is scientifically wrong and a teacher approves it in a hurry | moderate | before/after shown, human publish, one change per request, revertible in one click |
| Token in the page abused (Option B) | moderate | fine-grained, `issues: write` only, one repo; can be revoked and reissued |
| Copilot credits exhausted by a busy fortnight | low | ~4 credits/draft; budget guard: cap drafts per day |
| SharePoint app upgrades break the customizer | low | versioned package; `chromeMode` settable without rebuild |
| A teacher's request is misread by the agent | moderate | the chat/form requires where, what, and done-when; the agent asks rather than guesses |
| Nobody owns the repo if the developer leaves | **real** | the school needs a second person with write access and the ability to re-upload the package |

That last one is the least technical and the most important. Every piece built
here depends on one GitHub account and one person who can build a package.

---

## 9. The decision

Nothing else can be settled until this is:

> **Do teachers get GitHub accounts, or does a credential live in the page, or
> does the school run a flow?**

- **A** — accounts. Safe, no infrastructure, costs one signup per teacher and a
  GitHub form in the middle of the experience.
- **B** — token in the page, with Model 2 publishing. No accounts, no
  infrastructure, no human review of the science. Fastest to finish.
- **C** — Power Automate + Forms. No accounts, no public token, two forms instead
  of one page, and PA licence management.

My recommendation remains **A with Model 1**: it is a day's work, it needs no new
infrastructure, and it keeps a person between the agent and a live student-facing
page. Move to B once the agent's output has been reviewed a dozen times and the
failure modes are known.

---

## 10. Where everything lives

```
.github/
  workflows/       checks, draft-review, publish-draft, approve, rollback, labels
  agents/          course-editor persona
  instructions/    chapter-specific rules
  ISSUE_TEMPLATE/  the change request form
  copilot-instructions.md
server/            the change service (Node, 20 tests) — not deployed
spfx/hkis-biology-reader/
  src/extensions/biologyReaderChrome/   the reader page
  src/extensions/biologyChanges/        the teacher page
  sharepoint/solution/hkis-biology-reader.sppkg   1.7.0.0
assets/changelog.js · reference/changelog.html     the public change log
scripts/check-content.js                           content and path checks
```

Supporting documents: `AGENT-CONTRACT.md` (what the chat must call),
`sharepoint/AGENT-BUILD.md` (how to build the agent), `sharepoint/SECURE-API.md`
(why the token cannot live in the browser), `server/README.md` (deploying the
service), `sharepoint/TEACHER-GUIDE.md` (the page teachers read).
