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

<!-- Mechanical, and safe for the agent to tick — but only after actually
     running them. Do not pre-tick. -->

- [ ] `node scripts/check-content.js` passes locally
- [ ] Only `chapters/` and `assets/toc.js` changed
- [ ] Every `[data-track]` count still matches `sections` in `toc.js`
- [ ] American spelling, per `Writing Style.md`
- [ ] Anything quoted (NGSS standards, paper titles) is unchanged

## Reviewer sign-off — for the person publishing

<!-- Leave this section untouched. It is the one part of the record that
     says a human read the change, and it stops being evidence the moment
     it is ticked by whoever produced the change. -->

- [ ] I have read the changed sentences for scientific accuracy, not just
      tone
- [ ] The change does what the request asked, and nothing else
