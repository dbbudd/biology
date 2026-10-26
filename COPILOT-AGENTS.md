# Copilot agents: what your Pro licence actually gets you

Findings as of October 2026, checked against GitHub's own documentation rather
than assumed. The short version: the coding agent works on Pro, custom agents
work on Pro, and the constraint is not compute — it is a monthly AI-credit
allowance that a whole department would share.

## 1. Does the coding agent run on Pro?

Yes. GitHub's prerequisites list the subscription as *"Copilot Pro, Pro+,
Business, or Enterprise"*. Beyond the licence, the agent needs:

- write access to the repository (you have it — you own it)
- the agent **enabled** for your account, in Settings → Copilot
- Actions available on the repo (the agent works inside a GitHub Actions
  environment)

The flow is: assign an issue to `@copilot` → it works in an isolated Actions
environment → it opens a pull request, assigns itself as author and you as
reviewer → you comment `@copilot …` to iterate → it pushes more commits.

Limits worth knowing: one repository per task, exactly one pull request per
assigned issue, and it cannot modify a pull request it did not create.

## 2. The thing that changed this year

On **1 June 2026** every Copilot plan moved to usage-based billing. Premium
request units were replaced by **GitHub AI credits**, priced on tokens at each
model's API rate. One credit is $0.01.

| | Price | Included credits |
| --- | --- | --- |
| Copilot Pro | $10/mo | $10/mo of AI credits |
| Copilot Pro+ | $39/mo | $39/mo |
| Copilot Business | $19/user/mo | $19/user/mo (pooled) |
| Copilot Enterprise | $39/user/mo | $39/user/mo (pooled) |

**Measured on the education account, October 2026:** the plan shows
**1,500 included AI credits per month** (about $15), resetting on the 1st, and
a first draft consumed about **4 credits ($0.04)**. The allowance is therefore
much more generous than the "$10 Pro" row above suggests, and one draft is
cheap enough that a department's weekly use is comfortably inside it. Check
`github.com/settings/billing` on the account actually running the agent rather
than trusting the table.

What matters for this project:

- **Code completion and Next Edit Suggestions do not consume credits.** Only
  agent-style work — chat, coding agent sessions, code review — is metered.
- **Unused credits do not roll over.** A quiet month is not a saving.
- **Actions minutes are billed separately from credits**, and on a *public*
  repository Actions minutes are free. So the agent's compute costs nothing
  here; only the model does.

That last point is the important one: the scarce resource is the model's
tokens, not the runner.

## 3. What that means for a teacher-facing agent

One draft = one coding-agent session. A session on this repository reads
several chapter files and writes a small diff, so it is not a large job — but
it is a full agent run, and it is not free.

The honest position, revised after measuring:

- **At ~4 credits a draft against 1,500 a month, a department of five using it
  weekly is comfortably inside the allowance** (~80 credits a month).
- **Keep the budget guard anyway.** It is what makes the cost predictable, and
  a runaway loop is cheap to prevent and expensive to discover.
- **Do not build a service that depends on one person's education licence.**
  The licence is personal, its terms are for individual use, and if you leave
  the role the editing tool leaves with you. For anything that other staff
  come to rely on, that is a Business seat (pooled credits, org ownership) —
  or the whole content path moves to Copilot Studio capacity, which is what
  the chat side needs anyway.

Add a budget guard: cap drafts per teacher per day. That is the cheapest way
to make the cost predictable, and it also protects against a lively afternoon
producing forty half-finished drafts.

## 4. Custom agents are the part to use now

Independent of the licence question, custom agent files are file-based and
work with the coding agent today. Two are now in the repository:

| File | Scope |
| --- | --- |
| `.github/copilot-instructions.md` | every change in the repo |
| `.github/agents/course-editor.md` | the persona a teacher's request is given |
| `.github/instructions/chapters.instructions.md` | only `chapters/**` and `assets/toc.js` |

The layering is deliberate. The global file states the house rules; the
path-scoped file states what is true of chapter prose; the agent file states
how to behave when a *teacher* is asking, including when to refuse. If the
agent ever starts inventing CSS classes or wandering into `sims/`, the fix
belongs in one of these three files, not in the prompt the chat sends.

## 5. How it plugs into what is already built

Nothing needs to change. The pieces were built around an agent that cannot be
trusted to publish itself:

```
teacher → chat → issue → @copilot → draft PR
                                      │
                        draft-review.yml: checks + before/after comment
                                      │
                        teacher says publish → `approved` label
                                      │
                        approve.yml: refuses red builds, merges, rebuilds
```

The coding agent cannot merge its own pull request, and `approved` is a label
only someone with write access can apply. The guard rails survive.

## 6. The experiment worth running before any build

Half an hour, one issue, and it answers every open question:

1. Enable the agent (Settings → Copilot → Copilot coding agent).
2. Create an issue using the `Course change` form — pick a real, small edit,
   for example shortening one paragraph in `chapters/u2-photosynthesis.html`.
3. Assign it to `@copilot`.
4. Watch what it does to the **pull request description** — does it describe
   the change in a teacher's words, as the agent file asks?
5. Read the `draft-review` comment that `draft-review.yml` posts. Compare it
   with the agent's own summary. When they disagree, that gap is the thing
   this whole design exists to catch.
6. Check your billing page afterwards and note the credit burn for one draft.
   Multiply by your expected drafts per week. That number decides whether
   this is a Pro experiment or a Business seat.

If step 4 is disappointing, the fix is prompt-shaped and lives in
`.github/agents/course-editor.md` — not in the plumbing.

## Sources

- [Kick off a task with Copilot agents](https://docs.github.com/en/copilot/how-tos/copilot-on-github/use-copilot-agents/kick-off-a-task)
- [Copilot coding agent prerequisites and workflow](https://raw.githubusercontent.com/microsoft/vscode-docs/main/docs/copilot/copilot-coding-agent.md)
- [Custom agents for GitHub Copilot](https://github.blog/changelog/2025-10-28-custom-agents-for-github-copilot/)
- [Custom agent file format reference](https://raw.githubusercontent.com/github/gh-aw/main/.github/skills/custom-agents/SKILL.md)
- [GitHub Copilot is moving to usage-based billing](https://github.blog/news-insights/company-news/github-copilot-is-moving-to-usage-based-billing/)
