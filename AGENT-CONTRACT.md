# Connecting the chat agent

Everything on the repository side is built. This is what the chat layer has
to do, and the only place it needs GitHub.

The contract is four calls and one label. Nothing else.

```
chat                     GitHub
 |                         |
 |-- 1. open issue ------->|  title + body (the brief) + labels
 |                         |  assign Copilot coding agent
 |                         |  → it works, opens a draft PR
 |<-- 2. poll -------------|  issue timestamps, PR state, labels
 |                         |
 |-- 3. apply `approved` ->|  approve.yml merges, Pages rebuilds
 |<-- 4. read back --------|  the draft-review comment
```

## 1. Open the issue

The issue **is** the brief. The more precise it is, the less the agent has to
guess, and the shorter the loop with the teacher.

```http
POST /repos/dbbudd/biology/issues
{
  "title": "[change] Slow down the stroma paragraph",
  "labels": ["change-request"],
  "body": "..."
}
```

Body format — plain Markdown, the same fields the manual form collects:

```markdown
## Chapter
2.3 Two Halves of One Process (`chapters/u2-photosynthesis.html`)

## Change
The paragraph starting "The stroma is where…" assumes students already know
what a gradient is. Define it first, then continue.

## Done when
A reader who has not met "gradient" before can follow it without leaving the page.

## Scope
Wording only.

## Do not
Change anything outside this chapter.
```

`chapters/u2-photosynthesis.html` is optional. Include it when you know it —
it removes a lookup — but the chapter title alone is enough.

Then hand the issue to Copilot. This is the same action as the "Assign to
Copilot" button in the UI, and the login differs by surface, so **capture it
once rather than hard-coding it**:

```bash
# see what the assignable login actually is in your repo
gh api /repos/dbbudd/biology/assignees --jq '.[].login'
# assign it
gh api -X POST /repos/dbbudd/biology/issues/$N/assignees \
  -f 'assignees[]=copilot-swe-agent'
```

If Copilot is not assignable, the repo setting is in **Settings → Copilot →
Coding agent**. It also needs Actions enabled, and the *actor* opening the
issue must have write access.

## 2. Poll

The chat does not need webhooks to start. Poll the issue every 20–30 seconds:

```http
GET /repos/dbbudd/biology/issues/123/timeline
GET /repos/dbbudd/biology/issues/123/comments
```

What to look at:

| Signal | Means |
| --- | --- |
| a linked pull request appears | the agent has started |
| issue comment `<!-- draft-ready -->` | checks pass, ready to show the teacher |
| the issue closes | published (the merge closes it via `Fixes #N`) |
| PR closed without merge | rejected, or superseded — tell the teacher |

Polling the issue is enough. The PR is the agent's workspace; the issue is the
teacher's thread, and the workflow mirrors what matters across.

To show the teacher what changed, read the comment on the **issue** that starts
with `<!-- draft-ready -->`. It is a copy of the pull request's review comment:
before/after sentences generated from the diff itself, not the agent's own
description of its work. Show that. When the agent's summary and the diff
disagree, trust the diff.

Everything a teacher needs is therefore in one thread — the issue. The chat does
not have to find or read the pull request to answer "what did it change?": the
issue carries the request, the draft summary, and the final publish line.

## 3. Publish

There are two paths, and the difference is **where the request came from**, not
who the teacher is.

### The trusted path — the chat dispatches a workflow

When the request originated in SharePoint, publishing is a workflow dispatch.
No developer stands by, and no GitHub label is involved.

```http
POST /repos/dbbudd/biology/actions/workflows/publish-draft.yml/dispatches
{
  "ref": "main",
  "inputs": {
    "pull_request": "7",
    "head_sha": "a869c307d7e2128db1e82e37830c81e98a99e8f3",
    "approved_by": "teacher@hkis.edu.hk",
    "request": "1"
  }
}
```

`publish-draft.yml` then:

1. **Checks who dispatched it.** `github.actor` must equal the repository
   variable `PUBLISH_ACTOR`. If that variable is unset, the job skips. The
   token, not the request body, is the permission.
2. **Checks the draft is the one that was approved.** `head_sha` must equal the
   pull request's current head. This is the important one: if the agent pushed
   again after the teacher read it, the publish is refused and the chat must
   show the new version and ask again.
3. **Checks the scope.** Every changed file must be under `chapters/` or be
   `assets/toc.js`. Anything else is refused as a maintainer change.
4. Re-runs the content checks against the approved commit.
5. Records an approval review naming the teacher, merges, comments with the
   approver and the verified commit, and asks Pages to rebuild.

`approved_by` cannot be verified from GitHub — it is the chat's claim, recorded
so the history names a person. The chat is the system of record for who asked.

**Do not put the model in charge of these inputs.** The PR number, head SHA and
approver should come from the chat's own state after the teacher confirms; the
model should decide only *whether* the teacher approved, never *what* to
publish.

### The manual path — everything else

Anything that did not come from the trusted origin:

- a pull request a person opened,
- a draft that touches `sims/`, `assets/`, `images/`, `vendor/` or `.github/`,
- a change to the reader shell rather than chapter text.

Those publish by adding the `approved` label, which a maintainer applies:

```http
POST /repos/dbbudd/biology/issues/{pr_number}/labels
{ "labels": ["approved"] }
```

`approve.yml` refuses a draft or a red build, merges, and rebuilds. This path
exists so that "trusted origin" never becomes "any origin": the day the chat
takes a request it should not have, the blast radius is one refused workflow,
not an unexplained change to the site's shell.

| Situation | Path |
| --- | --- |
| Chapter text, requested in SharePoint, teacher said publish | dispatch |
| Any PR touching anything outside `chapters/` | manual label |
| A PR a person opened | manual label |
| Chat is down, urgent fix | manual label |

## 4. Read back

After publishing, the site rebuilds in about a minute. Confirm before telling
the teacher it is live:

```http
GET https://dbbudd.github.io/biology/{chapter}.html
```

Compare the ETag or `Last-Modified`. Announcing "published" before the build
lands is the fastest way to lose a teacher's trust.

## Labels

| Label | Set by | Meaning |
| --- | --- | --- |
| `change-request` | chat or person | a brief, not yet work |
| `draft-ready` | `draft-review.yml` | checks pass, awaiting review |
| `approved` | **human decision** | publish this |
| `owner-change` | maintainer | authorises edits outside the content allowlist |
| `needs-owner` | agent | stuck: the request needs someone who owns the shell |

## What the conversation must never be allowed to do

- Merge a pull request directly. Publishing goes through the label so that
  `approve.yml` can refuse a red build.
- Add `owner-change`. That label is how a maintainer vouches for a change
  outside `chapters/`; an agent must not be able to vouch for itself.
- Edit files itself. It has no reason to; it opens an issue.
- Tell the teacher a change is live before the site serves it.

## Failure modes to design for

These will happen. Decide now what the teacher sees.

| Situation | What to say |
| --- | --- |
| Copilot cannot be assigned (no write access, policy off) | "I can't start a draft right now — this needs the site owner." |
| Agent asks a question on the issue | Relay it verbatim. A question is better than a guess. |
| Checks fail and the agent cannot fix it | "The draft breaks a link in the chapter. I've asked for a fix." |
| Agent labelled `needs-owner` | "That change is structural — it needs the site owner, not a text edit." |
| Draft is ready but the teacher goes quiet | Leave it. A stale draft costs nothing; a wrong publish does. |
| Teacher asks for something twice | Point at the earlier draft rather than opening a second issue. |
