# Hosting in SharePoint and letting teachers edit by chat

A plan for putting this reader in front of students inside SharePoint, with a
chat agent that lets biology teachers change the content without ever seeing
code, a branch, or a pull request.

Written against the repository as it stands on 2026-10-26.

---

## 1. What already exists

Checked today, not assumed:

| Fact | Value |
| --- | --- |
| Live site | `https://dbbudd.github.io/biology/` — serving, HTTP 200 |
| Hosting | GitHub Pages, build-from-branch, Jekyll off (`.nojekyll`) |
| Tracked files on the site | 771, **324 MB** |
| GitHub Pages limits | 1 GB source, 1 GB published, 100 GB/month soft bandwidth |
| Framing | Pages sends **no** `X-Frame-Options` — it can be iframed |
| Working folder on disk | 1.6 GB, but the extra is ignored: `_originals/` TIFFs, `.blend` files |
| CI | **none** — no `.github/` directory at all |
| Deploy step | automatic on push to `main` |

So the hosting half of the problem is already solved. What is missing is the
authoring half.

## 2. One correction to the plan

**Do not iframe the GitHub page.** Embed the published site instead.

- `github.com/dbbudd/biology` is blocked from being framed, and even where it
  were not, teachers and students would be looking at a code browser.
- `dbbudd.github.io/biology` is the actual website, is already built, and can
  be framed.

The iFrame target is therefore a one-line difference:

```text
https://github.com/dbbudd/biology      ->  no
https://dbbudd.github.io/biology/      ->  yes
```

SharePoint will still refuse it until a site collection administrator adds
`dbbudd.github.io` to the allowed embed domains (Site settings → HTML Field
Security → *Allow contributors to insert iframes only from the following
domains*). That is a five-minute admin task, but it is a gate: without it the
Embed web part shows "Embedding content from this website isn't allowed."

## 3. The gap the plan is missing

> "A chat request creates a pull request."

Two things sit between those, and neither of them is something GitHub Copilot
does:

1. **The chat** — a conversation that remembers the course, understands
   "make the osmosis section less wordy", and shows the teacher what changed.
2. **The publish decision** — a preview, a chance to ask for revisions, and an
   approve action that is not the same thing as a GitHub merge button.

GitHub's coding agent can absolutely do the editing step: assign it an issue,
it works in a branch, opens a draft pull request. But it cannot host a
teacher-facing chat, cannot show a rendered preview, and cannot decide when
content is good enough to publish. Those are ours to build.

The correct mental model:

```text
teacher
  |  chat (SharePoint / Teams)
  v
Copilot Studio agent ......... holds the conversation, the course vocabulary,
  |                           the writing rules, the approval gate
  v
orchestration (Power Automate / Azure Function)
  |                           turns a conversation into a precise brief,
  |                           opens the job, watches it, reports back
  v
GitHub (issue -> Copilot coding agent -> draft PR -> checks -> preview)
  |                           does the editing inside the repo
  v
GitHub Pages (main)  ......... the site SharePoint embeds
```

GitHub Copilot is the *editor*, not the agent the teacher talks to.

## 3a. Could the content live in SharePoint instead?

This comes up, and the answer is: keep the content in GitHub, and let
SharePoint be the front door. Not because GitHub is fashionable — because of
what each system is actually good at.

| | GitHub | SharePoint |
| --- | --- | --- |
| Store a version | commit | version history |
| Compare two versions | diff, line by line | download both and compare by hand |
| Propose without publishing | branch + pull request | edit the live page, then restore |
| Undo one sentence | revert that hunk | restore a whole version |
| Let a machine edit safely | yes, scoped to a folder | it edits CanvasContent JSON |

Four concrete problems with SharePoint as the *source*:

1. **Version history is restore, not review.** A teacher's draft would be a
   live page until someone notices. There is no "show me what you propose to
   change" state, which is the entire feature you asked for.
2. **Pages are not text.** A modern SharePoint page stores its content as
   `CanvasContent1`, a JSON blob of web-part instances. An agent editing that
   is editing a data structure, not prose — far harder to constrain, and a
   bad edit corrupts the page rather than a paragraph.
3. **The shell would have to be rewritten.** All 47 chapters, the glossary,
   search, the progress tracking and the sim loader are built on static files
   and `assets/toc.js` as the single source of truth. Reading from the
   SharePoint API instead is a different application.
4. **Weight.** The published site is 329 MB, much of it voice models and
   images. SharePoint pages are not a CDN for that; `embed.html` exists
   precisely because sims had to be framed in from elsewhere.

What SharePoint gives you that GitHub does not: identity, permissions and a
place teachers already go. Use it for exactly that — the SharePoint page holds
the reader in an Embed web part and the agent in the agent pane. Both are
surfaces onto a GitHub-hosted truth.

If the answer is ever "content must not live in GitHub" for policy reasons,
the move is **not** SharePoint pages. It is Azure Static Web Apps in your own
tenant, built from the repo. Content stays reviewable; serving moves inside
your boundary.

## 4. What the teacher actually sees

The interface must never mention branches, PRs, or files. A session:

> **Teacher:** Unit 2 photosynthesis feels too dense for my class.
>
> **Agent:** I found 4 paragraphs in *Inside a leaf* and *Photosynthesis* that
> run over 35 words. I can shorten them and add a one-line summary at the top
> of each section. Draft in about 6 minutes — I'll message you when it's ready.

> **Agent:** Draft ready. Changes: 4 paragraphs shortened, 1 summary added to
> each of 2 sections. Nothing else touched.
> [before/after of the 4 paragraphs]
> [Preview] [Ask for changes] [Publish]

> **Teacher:** The second one lost the point about the stomata.
>
> **Agent:** Restored that sentence, shortened the rest. Draft 2 ready.

> **[Publish]** → merged, Pages rebuilds, the SharePoint embed updates itself.

Two design points in that transcript matter more than the plumbing:

- **The diff is summarised in the teacher's language, not shown as code.**
  Show the changed sentences as before/after text, not a patch.
- **Publish is a separate, deliberate action** on a specific draft the teacher
  has seen. Never auto-merge on "looks good".

## 5. Previews: the security trap

Unpublished drafts must not become public. This kills the obvious approach.

GitHub Pages serves exactly one site per repository, and it is public. If a
preview is published to Pages, every half-finished draft is world-readable at
a guessable path. That is unacceptable for a course where the README already
flags third-party copyrighted figures and permissioned teacher material.

Three options, in order of effort:

| Option | How | Trade-off |
| --- | --- | --- |
| **A. Screenshots in chat** | CI renders the changed sections with a headless browser and posts before/after images into the conversation | No new hosting, no new auth, nothing public. Best for the 80% of edits that are prose. |
| **B. Private preview app** | Azure Static Web Apps + Entra ID login, one preview URL per draft | Real clickable preview of the whole chapter; needs an Azure subscription and IT sign-off. |
| **C. SharePoint-hosted build** | CI produces a zip, uploaded to a SharePoint document library | Keeps everything inside M365; clumsy, and the reader's relative paths need rework. |

Start with A. Add B only when teachers ask to click through a whole chapter.

## 6. Guardrails: what the agent is allowed to touch

This is where the risk actually lives, and it is cheap to control.

**Allow:** `chapters/*.html` and the `chapters` block of `assets/toc.js`.

**Never:** `assets/course.js`, `assets/course.css`, `sims/`, `vendor/`,
`models/`, `images/`, `.github/`, `DESIGN.md`, `Writing Style.md`.

Enforce it in CI rather than in the prompt — a prompt is a suggestion, a
failing check is a fact:

- **Path allowlist.** Reject the PR if the diff touches anything outside
  `chapters/` and the `toc.js` chapter list. Five lines of script.
- **Run the existing rules.** `CLAUDE.md` already states most of them, so
  turn them into checks: American spelling (`organize`, `color`, `behavior`,
  `fertilization`, `center`, `hemoglobin`, `sulfur`), no raw hex colours
  outside tokens, internal links resolve, `[data-track]` count still matches
  the `sections` number in `toc.js` (the reader's progress bar depends on it).
- **`npx @google/design.md lint DESIGN.md`** on any PR that touches design.
- **Science review stays human.** `CLAUDE.md` says to check the science
  whenever a sentence changes. An agent shortening a paragraph can silently
  break a mechanism. Make that an explicit checkbox on the publish step, and
  keep a named course owner responsible for it.

A change to `chapters/` cannot break the toolbar, the themes or the sims,
because the shell lives elsewhere. That is the architectural win: the
existing split between the template and the content is what makes safe
delegation possible. Keep it.

## 7. Phased plan

### Phase 0 — prove the embed (about an hour, no AI)

1. Admin adds `dbbudd.github.io` to the site collection's allowed embed
   domains.
2. Add an Embed web part to a test SharePoint page.
3. Check three things inside the frame: reading works, the theme switch
   persists, and the reader is usable at the height the web part allows.

Known wrinkle to expect: the reader stores reading progress in
`localStorage`. Modern browsers partition storage for third-party frames, so
progress saved inside the SharePoint embed will not be shared with a direct
visit to the Pages site. It still persists for a teacher who only ever uses
the SharePoint page, so this is cosmetic — but decide whether to accept it or
move progress to the SharePoint side later.

### Phase 1 — make publishing a process (a day) — **built**

Still no AI. This is the part that makes the AI safe later.

What now exists:

| File | What it does |
| --- | --- |
| `scripts/check-content.js` | TOC ↔ file agreement, section counts, links, colours, spelling ratchet, path allowlist |
| `scripts/content-check` | runs it without needing `node` on `PATH` |
| `.github/workflows/checks.yml` | the above on every PR, plus the body-map check |
| `.github/workflows/publish.yml` | optional Actions-based Pages build; **off** until you set the repo variable |
| `.github/workflows/../CODEOWNERS` | review required for the shell, not for chapter text |
| `.github/ISSUE_TEMPLATE/change-request.yml` | the brief a chat request is turned into |
| `.github/pull_request_template.md` | teacher-readable summary and the science checkbox |

What it caught immediately: `u4-feedback` claimed `sections: 7` in `toc.js`
but had 10 trackable items, so its progress bar was wrong. Fixed.

**Three settings only you can apply** (they live in the repo's settings, not
in a file):

1. Create the labels `change-request` and `owner-change`.
2. Settings → Branches → protect `main`: require a pull request, require the
   `Content and structure` check, require review from Code Owners
   (this is what makes the path allowlist meaningful).
3. Decide the Pages source. Leave it on *Deploy from a branch* and
   `publish.yml` stays dormant. Switch it to *GitHub Actions* **and** set the
   repository variable `PAGES_FROM_ACTIONS=true` to take over — needed before
   any per-PR preview deployment can exist.

First real teacher-visible win: nothing. But every later step depends on this,
and it is the step most often skipped. The spelling ratchet is the important
half: about a third of the reader is still British-drafted, so the check
records today's count per file and fails only when a file gets *worse*. A
conversion pass lowers it with `node scripts/check-content.js
--update-baseline`.

### Phase 2 — the agent, minimal (a week or two)

- Copilot Studio agent published to SharePoint, holding: the course map, the
  writing style, the allowed-edit list, and a refusal path ("that changes a
  simulation, ask the site owner").
- One flow: brief → GitHub issue → assign to Copilot → poll PR → post
  summary and preview → publish button.
- Decision needed first: **Copilot Studio capacity**. Publishing an agent to
  SharePoint via Copilot Studio consumes Copilot Studio capacity, even when
  used inside SharePoint. If the school only has Microsoft 365 Copilot
  licences, this is a purchase, not a setting.

### Phase 3 — quality and trust

- Screenshot previews (option A above).
- Change history page: what changed, when, by whom, one-click revert.
- Budget guard: cap drafts per day so a lively department cannot eat the
  allowance in a fortnight.

## 8. Things to confirm before committing

| Question | Why it matters | Owner |
| --- | --- | --- |
| Can `dbbudd.github.io` be allowlisted? | Blocks Phase 0 entirely | SharePoint admin |
| Is the course allowed to be **public**? | Pages is public. The embed does not protect it; a link works from anywhere. | You / IT |
| Copilot Studio capacity or M365 Copilot only? | Determines whether the chat is feasible as designed | IT licence review |
| Is the GitHub Education Copilot benefit valid for a shared, school-run service? | Free-for-educators terms are personal; verify before depending on it | You |
| Do the placeholders with McGraw-Hill notices get replaced before this goes public? | Copyright, and the agent raises output volume | You |
| Does the repo's weight matter? | 324 MB is fine for Pages but heavy for a coding agent to check out and reason over. `vendor/piper` alone is 144 MB of voice models. | You |

## 9. The realistic risk

The agent will produce confidently-worded prose that is subtly wrong about
biology, and a teacher under time pressure will approve it. Nothing in this
plan prevents that. The mitigations are: keep edits narrow, show the changed
sentences rather than a summary, require a named human to sign off, and keep
every change revertible in one click. Do not let the chat say "published
successfully" without a human having read the diff.

The second risk is quieter: a teacher asks for one thing, the agent tidies
three others, and the change history becomes unreadable. The path allowlist
prevents structural damage but not scope creep. Teach the brief format to
demand *one* change per draft, and have the agent ask when a request is vague.

---

## Summary

- Hosting is done: `dbbudd.github.io/biology` is live, embeddable, 324 MB.
- Embed the site, not the repository.
- Chat and publishing are ours to build; Copilot is the editor behind them.
- Never publish a draft to Pages. Show screenshots in chat instead.
- Let the agent write only in `chapters/`; enforce it in CI, not in a prompt.
- Two hard dependencies: an admin who will allowlist the domain, and Copilot
  Studio capacity.
