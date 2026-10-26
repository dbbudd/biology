# Instructions for the coding agent

You are editing the text of the HKIS Biology course reader. Teachers ask for
changes in plain language through a chat; your job is to make exactly that
change and nothing else.

Read `CLAUDE.md`, `Writing Style.md` and `DESIGN.md` before your first edit.

## Scope — what you may change

**Allowed**

- `chapters/*.html` — the prose, headings and captions students read.
- `assets/toc.js` — only the chapter entries: `title`, `summary`, `keywords`,
  `sections`, `status`, `time`.

**Never, for any reason**

- `assets/course.js`, `assets/course.css`, other files in `assets/`
- `sims/`, `vendor/`, `models/`, `images/`
- `.github/`, `DESIGN.md`, `Writing Style.md`, `CLAUDE.md`, `README.md`
- any new dependency, configuration file or build step

The reading shell is shared by every page. One "small fix" there breaks all
47 chapters at once, and you cannot see the result. If a request needs it,
stop and comment on the issue with `needs-owner` and one sentence saying what
is needed.

A pull request that touches anything outside the allowlist fails
automatically. That is the check doing its job, not an obstacle to work
around.

## The rules the text follows

- **American spelling.** organize, color, behavior, analyze, fertilization,
  center, hemoglobin, sulfur, fetus, estrogen. The reader was first drafted in
  British spelling; if you rewrite a passage, convert its spelling in the same
  pass, and never leave one page mixing both.
- **Quoted wording does not change.** NGSS standard text, "I can" statements
  and paper titles stay exactly as published, even if their spelling is not
  American.
- **Keep the science right.** Simplifying a sentence is where a mechanism
  quietly breaks. If you are unsure what a term means here, do not guess —
  read the surrounding chapter, or ask.
- **Keep the structure in step.** `sections` in `assets/toc.js` must equal the
  number of `[data-track]` elements in the chapter. Adding or removing a
  tracked item means updating both.
- **Match the house voice.** Read `Writing Style.md`; it is specific about
  sentence length, jargon, and how new terms are introduced.

## How to work

1. Read the whole chapter section before editing it. The reader argues across
   sections; a sentence that looks redundant is often the setup for the next
   one.
2. Make one change. If the request contains several, do the first and say so
   in the pull request.
3. Do not tidy text nobody asked about. Unrelated improvements make the
   teacher's review harder, and they will approve something they did not read.
4. If the request is ambiguous, ask on the issue instead of guessing. A
   question costs a minute; a wrong draft costs the teacher's trust.

## The pull request

The description is read by a biology teacher, not a developer.

- Say what changed in their words: "shortened four paragraphs in *Inside a
  leaf* and added a summary line to each section."
- Show the sentences that changed, before and after.
- Never write "refactored", "markup", "diff", or file paths as the main point.
- Fill in the "Checks" boxes only after actually running the checks.
- **Never touch the "Reviewer sign-off" section.** Leave its boxes unticked.
  It is the record that a human read the change, and it stops being evidence
  if you tick it yourself.

## What happens next

Checks run automatically. Then a person reads your before/after and decides
whether to publish. You do not merge, and you cannot approve your own work.
