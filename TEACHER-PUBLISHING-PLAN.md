# Teacher publishing — the plan I'd actually build

A counter-plan to `BIOLOGY-CHANGES-IMPLEMENTATION-PLAN.md`. That document is
thorough and its security instincts are good; this one is smaller on purpose.
Where they conflict, the reasoning is below rather than implied.

## Principles

1. **GitHub is the record of what happened.** Issues, pull requests, checks and
   merges already store the history correctly. SharePoint is only justified
   where GitHub is genuinely weak: proving *which teacher* asked.
2. **A human reads the change before it is live.** No exceptions for a pilot.
   This is the one check nothing automates.
3. **Nothing privileged executes content it is about to publish.** Untrusted
   text must never run in a job that holds a write token.
4. **Ship the thin slice; earn the machinery.** A state machine earns its place
   when a manual process has actually hurt twice.

## What I take from their plan

- **A SharePoint list for intake.** System `Author` cannot be forged, which is
  strictly better than a marker in an issue body. This is the best idea in the
  document and I was wrong to hand-wave it.
- **Version-bound approval.** Approve a specific SHA; invalidate when it moves.
- **Three real defects it found in our code** — all confirmed by inspection:
  1. `scripts/check-content.js` evaluates editable `assets/toc.js` with
     `node:vm`, which is not a security boundary.
  2. The merge does not pin the head (`--match-head-commit`); the auto-merge
     fallback widens that window.
  3. "Published" is inferred from a merge, not verified against the live site.

## What I decline

| Their proposal | Why not |
| --- | --- |
| Four lists + state machine + audit ledger | A second source of truth for execution state that GitHub already holds. Drift, and twice the failure modes, for five teachers. |
| Synchronising flow polling GitHub every 2 minutes | The page can read GitHub directly and anonmously. No sync, no lag. |
| Approval expiry, per-item read ACLs, native Approvals | Right for a regulated process; the bottleneck we set out to remove. |
| Migrating gulp → Heft during a pilot | The build works and is verified. Don't move the floor while standing on it. |
| "No chrome-hiding" | Book-correct, but the reader is deployed and working, using selectors from the production handbook. Keep it, know the risk. |

## Build order

Each step has an exit test. Stop when the test passes; do not pre-build the next.

### Step 0 — the three defects — **done**

- [x] **Privileged job stops executing PR content.** `publish-draft.yml` no
      longer checks out and runs `check-content.js` with a write token; it reads
      the check results for the approved SHA instead.
- [x] **Merge pins the head.** `--match-head-commit "$APPROVED"` on the direct
      merge and on the auto-merge path; same in `approve.yml`.
- [x] **Deployment verified before "Published".** After merge, confirm the Pages
      build completed; the teacher-facing status only reaches Published once the
      live site serves the change.

Exit: a PR that edits `assets/toc.js` maliciously cannot execute code in the
publishing job; a draft that moves after approval cannot be merged.

### Step 1 — prove the two unknowns (half a day, no code)

- [ ] Power Platform data policy: a flow with a **SharePoint** trigger and a
      **GitHub "Create an issue"** action saves and runs.
- [ ] A user token can assign Copilot:
      `POST /repos/dbbudd/biology/issues/N/assignees {"assignees":["copilot-swe-agent"]}`.

Exit: both answers known. If DLP blocks the connector pair, Power Automate is out
and the service (already built) or the browser token is the path.

### Step 2 — intake with unforgeable attribution (one week)

- [ ] One list: `BiologyChangeRequests` — chapter, change, done-when, scope.
      Add-only for teachers, no edit, versioning on.
- [ ] Flow A: on item created → re-read `Author` → membership check → create the
      issue with validated attribution → write the issue number back.
- [ ] Teacher page reads status **from GitHub** (already built) and shows the
      attribution it got from the list.

Exit: a real teacher submits; the issue says who asked; a stranger's issue is
ignored.

### Step 3 — drafts and corrections

- [ ] Copilot assignment (from Step 1's answer).
- [ ] Corrections pass through verbatim as `@copilot` comments.
- [ ] Status: requested → drafting → ready, read from GitHub.

Exit: a teacher can get a second draft without leaving SharePoint.

### Step 4 — publish, with a human in it

- [ ] Publish action records the approver and the SHA; dispatch
      `publish-draft.yml`; merge pinned to that SHA.
- [ ] Autonomy only after this has run ten times without surprise.

Exit: the draft the teacher approved is the one that merged, and the page says
Published only when the live site serves it.

## Decisions that are yours

1. **Who may publish?** Any teacher, or a named course owner. The workflow
   supports either; pick before Step 4.
2. **Where do the lists live?** The HSStudents site or a staff site. Attribution
   data is staff-only; the reader is student-facing. Different sites is probably
   right.
3. **What happens when I leave?** A second person needs write access and the
   ability to rebuild the package. Not a technical problem, and the one most
   likely to bite.

## Not in scope

Analytics, a chat agent, previews of unpublished drafts, multi-repo support.
