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
| PR label `draft-ready` | checks pass, ready to show the teacher |
| PR label `approved` | published (your own action) |
| PR closed without merge | rejected, or superseded |

To show the teacher what changed, read the PR comment that starts with
`<!-- draft-review -->`. It contains before/after sentences generated from the
diff itself — not the agent's own description of its work. Show that. When
the agent's summary and the diff disagree, trust the diff.

## 3. Publish

The teacher's "Publish" is one call. It must only be made when a human has
said so in the conversation:

```http
POST /repos/dbbudd/biology/issues/{pr_number}/labels
{ "labels": ["approved"] }
```

`approve.yml` then refuses if the PR is a draft or the checks are not green,
merges it, and asks Pages to rebuild.

Add the label with a **service identity that has write access**, because the
label is the permission check. Do not expose a generic "add label" action to
the chat model — expose exactly this one, with the PR number supplied by your
own state, never by the model.

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
