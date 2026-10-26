---
description: Rules for edits to chapter prose and the chapter list.
applyTo:
  - "chapters/**"
  - "assets/toc.js"
---

# Chapter content

These files are what students read. Everything here is about the text, not
about the site.

## The correspondence that must not drift

`assets/toc.js` is the single source of truth for the course. For every
chapter, `sections` must equal the number of `[data-track]` elements in the
chapter file. The contents page shows progress from that number without
opening the chapter, so a mismatch is a wrong progress bar on the front page.

If you add or remove a tracked item, change both in the same edit.

`data-chapter` on `<body>` must equal the chapter's `id` in `toc.js`.

## Keep the markup you find

The chapter files use the classes the reading shell provides — `lead`,
`figure`, `callout`, `quick-check`, `key-terms` and so on. Use the existing
ones; do not invent classes or write inline styles. `course.css` owns
appearance, and a raw colour in a chapter breaks the sepia and dark themes.

## Prose comes first

The house rules are in `Writing Style.md`, which is specific about sentence
length, how a new term is introduced, and how jargon is handled. Read it
before rewriting a section rather than after.

- American spelling. The reader was first drafted in British spelling; when
  you rewrite a passage, convert its spelling in the same pass.
- Quoted wording stays exactly as published: NGSS standards, "I can"
  statements, paper titles.
- Simplify the sentence, never the mechanism. If a term is load-bearing for a
  later chapter, keep it and define it.

## When the request is not a text change

A request for a new interactive, a layout change, a new image or a new
chapter is not an edit to these files. Stop and label the issue
`needs-owner`.
