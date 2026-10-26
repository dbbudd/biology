## What changed, in a teacher's words

<!-- Two or three sentences a biology teacher would recognise.
     Not "refactored the section markup" — "shortened the four longest
     paragraphs and added a summary box". -->

## Where

<!-- Chapters and sections touched. -->

## Before → after

<!-- Paste the sentences that changed. A teacher signing this off cannot
     read a diff, and should not have to. -->

**Before:**

> …

**After:**

> …

## Checks

- [ ] `node scripts/check-content.js` passes locally
- [ ] Only `chapters/` and `assets/toc.js` changed
- [ ] Every `[data-track]` count still matches `sections` in `toc.js`
- [ ] **The science still holds.** Simplifying a sentence is where a
      mechanism quietly breaks. Read it once for accuracy, not just tone.
- [ ] American spelling, per `Writing Style.md`
- [ ] Anything quoted (NGSS standards, paper titles) is unchanged
