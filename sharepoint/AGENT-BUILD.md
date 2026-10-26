# Building the teacher's chat agent

The teacher-facing half of the change process. Everything below is what a
person in Copilot Studio and Power Automate has to build; the GitHub side is
already done and waiting.

Target: a biology teacher asks for a change in plain language, reads a draft,
asks for adjustments, and publishes — without seeing the words *issue*,
*branch*, *pull request*, *commit* or *check*.

## What it should feel like

> **Teacher:** The photosynthesis chapter is too dense for my class.
>
> **Agent:** I found four paragraphs in *2.3 Two Halves of One Process* that
> run over 35 words. I can shorten those and add a one-line summary at the top
> of each section. Start a draft?
>
> **Teacher:** Yes.
>
> **Agent:** Started. It usually takes 5–20 minutes; I'll tell you when it's
> ready.

> **Agent:** Draft ready. Four paragraphs shortened, two summaries added. Here
> is what changed:
>
> **Before** — "That released energy is used to pump hydrogen ions across the
> thylakoid membrane, building up a concentration gradient inside the
> thylakoid."
>
> **After** — "A concentration gradient is a difference in the concentration
> of a substance between two areas. That released energy is used…"
>
> Say **publish** if this is what you wanted, or tell me what to change.

> **Teacher:** Keep it, but the second one lost the point about the stomata.
>
> **Agent:** Asked for that fix. The draft will update in a few minutes.

> **Teacher:** Publish.
>
> **Agent:** Published. It will be live in a minute or two — I'll confirm.

Note what is absent: no PR number, no branch name, no "checks passed". The
teacher is talking about the *course*, not about a repository.

## 1. The agent

- **Copilot Studio**, published to the **SharePoint** channel of the same site
  as the reader, or to Teams if teachers already live there. Publishing to
  SharePoint consumes Copilot Studio capacity — confirm that is provisioned
  before building.
- **Standard harness**, not the GitHub Copilot agent experience: the SharePoint
  channel is what makes it reachable from the course page.

## 2. Instructions — paste this into the agent

> You help biology teachers improve a course reader. Teachers describe a change
> they want in plain language; you turn it into a clear request, show them the
> draft, and publish it when they say so.
>
> **Never mention** pull requests, branches, commits, repositories, checks,
> labels, GitHub, or file names. The teacher is talking about their course.
>
> **One change per request.** If they ask for several things, pick the first,
> say what you are doing, and offer to do the rest afterwards.
>
> **Before starting anything**, you need three things: which chapter or
> section, what is wrong now, and how you will know it is right. Ask for
> whichever is missing — one question at a time, never a list. If their answer
> is already specific enough, do not ask again.
>
> **Always summarise the brief back** in one sentence and ask them to confirm
> before you start. A wrong draft costs them ten minutes of waiting.
>
> **Only say "publish" was done after the system confirms it.** If you are
> unsure, say you are checking.
>
> Refuse, politely and briefly, anything that is not a change to chapter text:
> layouts, images, simulations, new chapters, the site's navigation. Say that
> needs the site owner and that you have flagged it.
>
> If a teacher contradicts an earlier instruction, the newer one wins. If they
> ask for the same change twice, point at the earlier draft rather than
> starting a second one.

## 3. Topics

Build these as separate topics so the model is not inventing behaviour.

| Topic | Example triggers | What happens |
| --- | --- | --- |
| **Ask for a change** | "the photosynthesis chapter is too dense", "can we simplify…" | Gather the three things → confirm → create the request → start the draft |
| **Check my draft** | "is it ready?", "what did it change?" | Read the thread, relay the before/after |
| **Adjust the draft** | "keep the stomata bit", "that's not what I meant" | Send the correction, say it will update |
| **Publish** | "publish", "that's good, ship it" | Re-read the current draft, confirm, publish |
| **What's changed lately** | "what's new in the course?" | Summarise recent published changes |
| **Not a text change** | "add a diagram", "move this to unit 3" | Decline, explain, flag for the owner |

### Publishing has one extra rule

Before publishing, re-read the draft and check whether it changed since the
teacher last saw it. If it did, **show the new version and ask again**. The
workflow refuses a stale commit, so skipping this produces a confusing failure.

## 4. The flow

One Power Automate flow, or an Azure Function if you prefer code. The token
lives here and nowhere else — never in the agent, never in a web part.

All calls: `Authorization: Bearer <token>`, `Accept: application/vnd.github+json`,
`X-GitHub-Api-Version: 2022-11-28`, base `https://api.github.com`.

### A. Create the request

```http
POST /repos/dbbudd/biology/issues
{ "title": "[change] <one line>",
  "labels": ["change-request"],
  "body": "### Which chapter or section?\n…\n\n### What should change?\n…\n\n### How will we know it is right?\n…" }
```

The body must use those exact headings: the change log parses them, and the
agent reads them as its brief.

### B. Hand it to Copilot

```http
POST /repos/dbbudd/biology/issues/{issue_number}/assignees
{ "assignees": ["copilot-swe-agent"] }
```

The login varies. Discover it once: `GET /repos/dbbudd/biology/assignees`,
after seeing Copilot offer itself in the web UI. Do not hard-code a guess.

### C. Read the thread

```http
GET /repos/dbbudd/biology/issues/{issue_number}/comments
```

The comment containing `<!-- draft-ready -->` is the teacher-facing draft
summary — generated from the diff, not from the agent's own description.
**Relay that**, and treat it as more trustworthy than the PR description.

To find the linked draft: `GET /repos/dbbudd/biology/issues/{issue_number}/timeline`.

### D. Ask for a correction

```http
POST /repos/dbbudd/biology/issues/{pr_number}/comments
{ "body": "@copilot <the teacher's correction, in their words>" }
```

Pass the teacher's sentence through; do not paraphrase it into engineering
language.

### E. Publish

```http
POST /repos/dbbudd/biology/actions/workflows/publish-draft.yml/dispatches
{ "ref": "main",
  "inputs": {
    "pull_request": "{pr_number}",
    "head_sha": "{current head of that PR}",
    "approved_by": "{teacher's UPN from the conversation}",
    "request": "{issue_number}" } }
```

Get `head_sha` immediately before dispatching: `GET /repos/dbbudd/biology/pulls/{pr}` → `.head.sha`.
If the dispatch fails because the draft moved, that is the guard working — show
the teacher the new draft and ask again.

## 5. Identity and secrets

- The flow runs as a **service identity** — a GitHub App or a dedicated
  account with write access. Its token goes in Azure Key Vault or a Power
  Automate secure input, never in a variable a maker can read.
- Set the repository variable `PUBLISH_ACTOR` to that identity's login. Until
  it is set, `publish-draft.yml` refuses every dispatch.
- `approved_by` comes from the conversation's authenticated user, not from the
  model.
- Expose only these five calls to the agent. Not "run any GitHub API call" —
  the model should not be able to choose the repository, the branch, or the
  merge.

## 6. What to say when it goes wrong

| Situation | Teacher hears |
| --- | --- |
| Copilot cannot be assigned (policy off, Actions disabled) | "I can't start a draft right now — that needs the site owner." |
| The agent asked a question on the draft | Relay it verbatim. A question is better than a guess. |
| Checks failed and the draft cannot be fixed | "The draft breaks a link. I've asked for a fix; nothing is published." |
| The request is structural | "That changes the site, not the text. I've flagged it for the site owner." |
| Teacher goes quiet | Leave the draft. It costs nothing; a wrong publish does. |
| Teacher says publish twice | Publish once; ignore the repeat rather than starting a second flow. |

## 7. Build it in this order

1. **Flow, action A + B only.** Test manually: does an issue appear, does
   Copilot pick it up, does a draft arrive?
2. **Topic 1 and 2.** Ask for a change, then report the draft. This is 80% of
   the value and can be tested with one teacher.
3. **Topic 3.** Corrections — worth having before you invite a second teacher.
4. **Publish (E).** Last, because it is the one that can harm a live site.
   Keep the `approved` label path as your manual fallback until this has
   published five times without a surprise.

## 8. The question worth settling before building

Who is allowed to ask? If every teacher can publish, one enthusiastic person
can change the course overnight. Options:

- **Anyone can ask; one named owner publishes.** The workflow supports this
  today — the dispatch names `approved_by`, so the log shows who approved.
- **Anyone can ask and publish**, and the change log is the accountability.
- **Per-unit owners**, if the course is split between staff. That needs a small
  lookup table in the flow: chapter → owner, checked before the dispatch.

Pick one before launch. Retrofitting approval rules after teachers have the
habit is much harder than choosing them now.
