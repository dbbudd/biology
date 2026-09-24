# HKIS Biology Reader

## Writing

- Every sentence a student reads follows **`Writing Style.md`**. Read it before writing or
  rewriting any content: chapters, captions, glossary definitions, quick checks, overview pages,
  interactive labels.
- **Spelling is American**: organize, color, behavior, analyze, fertilization, center,
  hemoglobin, sulfur. The reader was first drafted in British spelling. Convert a chapter's
  spelling in the same pass as its rewrite, and never mix the two spellings on one page.
  Quoted wording (NGSS standards, "I can" statements, titles of papers) stays as published.
- **Check the science whenever a sentence changes.** Simpler wording must stay scientifically
  accurate, and notation must follow the conventions in section 3 of `Writing Style.md` (SI
  units, chemical formulas, italic gene symbols, allele letters, 5′/3′, binomial names, NGSS
  terms quoted exactly).
- Apply the rules with judgement, as section 8 of `Writing Style.md` describes. Fix what makes a
  sentence harder to read; do not churn text that already reads clearly.

## Design

- The look, structure and Universal Design for Learning (UDL) features of the site are in
  **`DESIGN.md`** (Google's DESIGN.md format: tokens at the top, reasons below). Read it before
  changing any page layout, color, component or reading tool.
- Use the CSS custom properties, never a raw color, so the light, sepia and dark themes all keep
  working. Check every new text and background pair for 4.5 : 1 contrast in all three themes.
- A new feature that helps learners goes into the template (`assets/`), so every page gets it, and
  is added to the UDL section of `DESIGN.md`.
- Check the file with `npx @google/design.md lint DESIGN.md` after editing it.

Build steps for a unit are in `UNIT-BUILD-PROCESS.md`.
