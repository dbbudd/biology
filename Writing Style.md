# Writing Style: HKIS Biology Reader

The rules for every sentence a student reads in this course: chapters, captions, glossary
definitions, quick checks, learning targets, overview pages, interactive labels, slides and
printouts.

Adapted from *Writing Teaching Materials: Rules That Transfer* by Graham Nolan (Computer
Science, HKIS, 23 September 2026). His rules were written one at a time, each after a real
sentence failed a real reader. This version keeps the rules that transfer, replaces the computer
science teaching frameworks with their NGSS equivalents, and adds rules for the formats this site
has. Section 10 records what changed and why.

**How to use it.** Read it before writing or rewriting anything a student sees. To have an AI
agent follow it, point to it from the project's `CLAUDE.md` or paste it at the start of the
conversation, and tell the agent to apply it to every student-facing sentence. Build steps (how
to make a unit, a figure or a simulation) live in `UNIT-BUILD-PROCESS.md`, not here.

---

## 1. Who we write for

**Readers in their second or third language.** Many HKIS students and families read English as
an additional language, often at a very high level. A phrase that needs a native speaker to
unpack it costs them a translation step. Plain English is not simplified content: the biology
stays as hard as the course needs, and only the wording gets easier.

**Readers who use the site's tools.** Plain sentences matter more here than in a printed book,
because the same sentence is reused in several ways:

- **Translate** sends each sentence to machine translation. Idioms and metaphors come back wrong.
- **Listen** reads the page aloud. Em dashes and symbols are read badly or skipped.
- **Cards, Present and Printout** lift sentences out of their page. A sentence that depends on the
  one before it ("This is why…", "As above…") makes no sense on a flash card or a slide.

**Every word carries information.** Students skip long explanations. A long answer does not look
thorough to them; it looks like something to skip.

**Everything is about the biology, never about the teaching.** No sentence explains how the course
is arranged, why a chapter exists, what a lesson is trying to do, or how the site was built. The
test: delete the clause. If the reader loses a fact, keep it. If they lose only an explanation of
the course design, cut it.

| Rejected | Replacement |
|---|---|
| Chapter 3.6 was written from scratch to fill that hole. | (cut) |
| These are the "I can" statements from the unit's Learning Targets document, word for word. | These are the unit's "I can" statements. |
| Most ask you to commit to an answer, because writing a prediction down makes you think it through. | (cut the reason; keep the instruction if one is needed) |

**Improve on what you replace.** A chapter is not a copy of the slides or the anchor guide it came
from. Where the source is unclear, say it better.

**Link to good material, with the context it lacks.** If a video, simulation or reading already
teaches an idea well, send students there and say which part to use and what to look for. Do not
copy it.

**Each fact has one home.** Definitions live in `COURSE.glossary`, standards in
`COURSE.standards`, chapter titles and times in `assets/toc.js`. Everything else points to them
or reads them. Two hand-maintained copies of the same fact will disagree within a term.

---

## 2. Sentence rules

### No em dashes

Use a period, a comma, a colon, a semicolon or parentheses. Search for `—` and `&mdash;` before
publishing.

Two exceptions exist because code reads them, and both should be changed in code rather than
worked around in writing:

- the figure label format `Figure 3.1 — caption` (read by `unit-content.js` to number figures);
- the unit label `Unit 1 — Biochemistry & Homeostasis` (set in `toc.js`).

### American spelling

HKIS is an American-style school and the NGSS is written in American English: *organize, color,
behavior, analyze, fertilization, center, hemoglobin, sulfur*.

The reader was first drafted in British spelling. Convert a whole chapter in the same pass as its
rewrite. Never mix the two spellings on one page.

### Plain international English

- **No colloquialism from any country.** "Muddled", "dump", "in one go", "the other way round",
  "have not got".
- **No idiom**, even a common one: "at a glance", "makes it click", "earns its place", "a rule of
  thumb" (write "an approximation").
- **Short sentences, ordinary word order.** A plain sentence is better than a clever one.
- **No contractions**: "does not", "it is". This keeps *it's* and *its* apart for readers who
  learned English from writing.
- **Speak to the student as "you"**, in the present tense.

### No metaphor for a biological idea

A metaphor makes the reader translate twice: out of the image, then into the idea. State what
happens. Avoid motion words where nothing moves.

| Rejected | Replacement |
|---|---|
| the mitochondrion is the powerhouse of the cell | mitochondria release energy from glucose in aerobic respiration |
| DNA is the blueprint | the DNA sequence determines the amino acid sequence |
| two ways to dump the electrons | two ways to regenerate NAD⁺ |
| the line falls off a cliff | the population falls sharply |

**A model is not a metaphor.** Models are a core NGSS practice (*develop and use a model*). When
you use one, say where it stops being true. Lock and key is useful until induced fit. Fluid
mosaic diagrams show a few proteins in a sea of lipid, but about half of a typical membrane's mass
is protein.

### Things do not want, know, try or tell

Cells, genes, organisms, species, data, graphs and results do not want, need (in the sense of
wanting), know, try, decide, learn, say or tell. Name the real process. People may still say and
tell.

**This is the most important sentence rule in biology**, because personification is itself a
misconception here: it is teleology, the idea that living things change *in order to* reach a
goal. It is the error Unit 6 spends a chapter correcting.

| Avoid | Write |
|---|---|
| the cell wants to reach equilibrium | water moves until the concentrations are equal |
| DNA tells the cell what to make | the DNA sequence determines which protein is made |
| the bacteria learned to resist the antibiotic | resistant bacteria survived and reproduced |
| giraffes grew long necks to reach the leaves | giraffes with longer necks left more offspring |
| the species adapted so that it could survive | individuals with a helpful variation left more offspring |
| the graph tells you | the graph shows |

### No phrasal verb whose meaning is not literal

A reader who knows "work" and "out" still cannot build "calculate" from them. Use the single
precise verb. A literal phrasal verb is fine: "pour it in", "turn off the burner", "look up a word".

| Rejected | Replacement |
|---|---|
| work out | calculate, determine, identify |
| find out | learn, identify, test |
| carry out | perform, do |
| set up | prepare, arrange |
| build on | extend, use |
| come back to | return to |
| turn into | become, convert |
| break down (food) | digest, hydrolyze |
| step by step | in order, one step at a time |

### Instructions use exact verbs

Use **state, name, describe, explain, calculate, compare, predict, label, sketch, complete**. These
match the verbs in the NGSS performance expectations and in the learning targets. "Say" and "tell"
are spoken English; use "say" only when a student speaks aloud.

| Rejected | Replacement |
|---|---|
| Say what happens to the cell, and say why | Predict what happens to the cell, and explain why |
| Work out the ratio | Calculate the ratio |

**No instruction depends on a class the reader may have missed.** "Describe what your partner saw
in the lab" cannot be answered by a student studying alone. Describe the observation in the text.

### One negative per sentence

Two negatives that act on each other make the reader do arithmetic. State what is true.

| Rejected | Replacement |
|---|---|
| A cell cannot divide unless the checkpoint is not triggered. | A cell divides only when it passes the checkpoint. |

A single negative is fine and often clearest.

### No "not X, it is Y" framing

Setting up a wrong idea only to knock it down doubles the reading and plants the wrong idea
first. State the true idea. Keep the contrast only in a misconception box, where naming the wrong
idea is the point.

| Rejected | Replacement |
|---|---|
| They are not three separate topics. They are three views of the same body. | Each one looks at the body at a different scale. |
| That is not a story about reindeer. It is the shape of a problem. | The same pattern appears in bacteria, crabs and lionfish. |

### Numbers, units and symbols

Numerals for measurements and counts (3 g, 45 rounds, 23 pairs), and thousands separated by
commas (8,388,608). Units, formulas, gene symbols and every other notation follow section 3.

### Links go where the instruction is

If a sentence sends the reader somewhere, the link is in that sentence.

- A chapter is referred to by its number alone, linked: `<a href="u1-digestion.html">1.3</a>`.
  Overview pages draw these as pills.
- A standard is referred to by its code, which the site links to the standards page.
- A glossary term is marked `<span class="term">` where it is taught (see section 6).

### Headings name the idea

Two to five words that name the idea, not the example or the activity. No teasers, no withheld
punchlines, no jokes. Use the technical term, so students learn the word and the idea together.
A question is written as a question.

| Rejected (from this reader) | Replacement |
|---|---|
| Two things that get muddled constantly | Energy and matter |
| Two ways to dump the electrons | Two kinds of fermentation |
| Where the other ninety per cent goes | Energy lost between trophic levels |
| Back to the bottle | Energy flows, matter cycles |
| Paine's crowbar, and the idea it produced | Keystone species |
| Set the puzzle up properly first | Same DNA, different cells |

Section ids (`id="…"`) do not have to change when a heading does. Links and progress tracking use
the id.

### Be concise

Say the thing and stop. If a paragraph can be halved without losing meaning, halve it.

---

## 3. Scientific accuracy and notation

A rewrite makes the wording simpler. It never makes the science less correct. Check the science
every time a sentence changes, because a shorter sentence often drops the qualifier that made it
true.

### Accuracy

- **Every claim is true at the level it is stated.** A simplification is allowed; a false
  statement is not. When a model or a generalization has limits, name them: "in most cells", "in
  humans", "a simplified model".
- **Every number is checked.** Calculate it, or cite where it came from. The first overview drafts
  said 75 mmol/L of glucose was "a third of a teaspoon" (it is about 13.5 g, about three teaspoons),
  that a cell copies "three billion base pairs" (a diploid human cell copies about six billion),
  and that CFTR "pumps" chloride (it is a channel).
- **Check against a reliable source**: a current university-level textbook such as OpenStax
  *Biology 2e*, or the primary source for any data set. A web page that repeats a claim is not a
  source.
- **Verify a calculation or model in code** before writing a chapter around it
  (`UNIT-BUILD-PROCESS.md`, step 9).
- **Use the NGSS terms for the ideas.** Write the words the performance expectations and core ideas
  use: *cellular respiration*, *carrying capacity*, *heritable*, *genetic variation*, *natural
  selection*, *feedback mechanisms*, *homeostasis*.

**Statements that are common in school biology and wrong.** Watch for these whenever you write or
rewrite.

| Wrong or misleading | Correct |
|---|---|
| Energy is released when bonds break. | Breaking a bond needs energy. Energy is released when stronger bonds form in the products. |
| Mitochondria make energy. | Mitochondria transfer energy from glucose to ATP. Energy is not created. |
| ATP stores energy in its bonds. | ATP releases energy when it reacts with water, because the products are more stable. |
| Plants photosynthesize and animals respire. | Plants do both. They respire all the time, in light and dark. |
| Respiration is breathing. | Cellular respiration is a chemical process in cells. Breathing is ventilation. |
| Genes code for traits. | Genes code for proteins (or functional RNA). Proteins, with the environment, produce traits. |
| Dominant means common, or stronger. | A dominant allele is expressed in the phenotype of a heterozygote. |
| Water moves from high to low concentration in osmosis. | Water moves across a partially permeable membrane from the solution with the lower solute concentration to the one with the higher solute concentration. Always say "solute concentration". |
| Individuals evolve, or adapt in order to survive. | Populations evolve. Individuals with helpful variations leave more offspring. |
| The fittest are the strongest. | Fitness is reproductive success in a particular environment. |
| Exactly 10% of energy passes up each trophic level. | About 10%, and it varies from about 5% to 20%. |
| Arrows in a food chain show who eats whom. | Arrows point in the direction energy and matter flow: from the organism eaten to the eater. |
| A cell membrane is made almost entirely of phospholipids. | Phospholipids form the bilayer, but about half of a typical membrane's mass is protein. |
| Small particles cross a membrane and large ones do not. | Chemistry matters more than size: a sodium ion is smaller than CO₂, but only CO₂ crosses the bilayer. |

Add to this table whenever a draft or a student produces a new one.

### Notation

The NGSS does not set its own notation. It expects the conventions scientists use, so this reader
uses these.

**Units (SI)**

- A space between number and unit: 37 °C, 6 µm, 75 mmol/L, 250 mL. No plural on a symbol (5 g,
  not 5 gs).
- Energy in joules (kJ). Use kcal only when a food label is being read.
- Very large and very small numbers in scientific notation: 3.7 × 10¹³ cells.
- A rate uses a slash or "per": mm/min, cells per mL.
- Percent with no space: 10%.

**Chemistry**

- Formulas with real subscripts and charges: C₆H₁₂O₆, CO₂, O₂, H₂O, Na⁺, Cl⁻, NAD⁺, NADPH, ATP,
  ADP, Pᵢ.
- Equations balanced, with an arrow (→), and a reversible arrow (⇌) only for a reversible reaction.
  Conditions go above the arrow: 6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂, with "light" above the arrow.
- A word equation and a symbol equation say the same thing, and the page shows which one it is
  using.

**Genetics and molecular biology**

- **Genes in italics, proteins in roman**: the *CFTR* gene codes for the CFTR protein. Human gene
  symbols are capitals (*CFTR*, *HBB*).
- **Alleles use one letter**: a capital for the dominant allele and the same letter in lower case
  for the recessive (*A*, *a*; genotype *Aa*). Never two different letters for one gene.
- **Sex-linked alleles** as superscripts on the chromosome: Xᴴ, Xʰ, Y. In HTML, write
  `X<sup>H</sup>`, so Listen and Translate read it correctly.
- **Codominant and multiple alleles** as superscripts on one base letter: Iᴬ, Iᴮ, i.
- **Generations** are P, F₁, F₂.
- **Ratios** with spaces around the colon: 3 : 1, 9 : 3 : 3 : 1.
- **Ploidy**: 2*n* = 46, *n* = 23.
- **DNA and RNA ends with a prime symbol**: 5′ and 3′ (not 5' and 3'). Bases A, T, G, C, and U in RNA.
  Codons written in mRNA, 5′ to 3′, in triplets: AUG.
- **Pedigree symbols** follow the standard: square for male, circle for female, filled for affected,
  half-filled or dotted for carrier where shown.

**Names of organisms**

- The scientific name in italics, genus with a capital letter: *Homo sapiens*, *Tradescantia*.
  After the first use, the genus is shortened: *E. coli*.
- Common names in lower case unless they contain a proper noun: reindeer, Norfolk Island robin.

**Graphs and tables**

- The independent variable on the x-axis, the dependent variable on the y-axis.
- Every axis and column heading has its quantity and unit: "Time (min)", "Mass change (%)". The
  unit goes in the heading, not in each cell.
- A figure of something microscopic carries a scale bar or its magnification.

**Investigations**

- Use the NGSS and course terms exactly: independent variable, dependent variable, controlled
  variables, control group, trials, mean.

**NGSS names are quoted exactly**

- The eight science and engineering practices and the seven crosscutting concepts keep their
  official names and capitals, for example *Analyzing and Interpreting Data*, *Cause and Effect:
  Mechanism and Explanation*, *Energy and Matter: Flows, Cycles, and Conservation*.
- A performance expectation is referred to by its code (HS-LS1-6) and quoted word for word when
  its wording is shown.

---

## 4. Banned phrases

Each of these was rejected at least once. **When you reject a phrase, add it here with its
replacement**, because a phrase removed once comes back unless something checks for it. Search
for each one before publishing.

| Rejected | Replacement |
|---|---|
| — (em dash) | . , : ; or parentheses |
| work out / worked out | calculate, determine |
| find out | learn, identify |
| set up | prepare, arrange |
| build on | extend, use |
| step by step | in order |
| in one go | all at once |
| the other way round | in reverse |
| tells you / tell you | shows |
| says so | states this |
| in mind | (state the fact directly) |
| at a glance | immediately |
| worth knowing / worth noticing | (cut) |
| is worth writing down | (cut, or give the instruction: "Write this down.") |
| earns its place | (cut) |
| makes it click | makes it clear |
| under the hood / at the heart of | (name the part) |
| rule of thumb | approximation |
| muddled | confused |
| astonishingly / surprisingly / remarkably | (cut) |
| one of the most important … ever | (cut, or cite who said so) |
| worth ten times / does an unreasonable amount of work | (cut) |
| is not decoration | (cut) |
| the whole subject / the whole point | (cut) |
| they are not X; they are Y | (state Y) |
| wants to / tries to (about a cell, gene or organism) | (name the process) |
| learned to (about a population) | survived and reproduced |
| so that it could / in order to (about evolution) | (name the selection) |

---

## 5. How students learn: principles for the content

These come from learning research. Each is given in the form the NGSS and this course use.

**Start from a phenomenon.** Each unit has one anchoring phenomenon, stated on its overview page
("The case we keep coming back to"): oral rehydration salts, the sealed bottle garden, the St
Matthew reindeer, cystic fibrosis. Chapters open with a smaller phenomenon of their own. The
explanation comes after the thing that needs explaining.

**Predict, observe, explain.** Students commit to a prediction, see the result, and then read the
explanation. Every interactive in this reader already works this way: it asks for an answer
before it explains anything. Use this one structure; do not nest other frameworks inside it.

**Claim, evidence, reasoning.** Written explanations follow CER, the structure the NGSS practice
*construct an explanation* asks for. Unit 6 uses VIDA (variation, inheritance, differential
survival, adaptation) as the reasoning step for natural selection.

**What happens is discovered; conventions are told.** A result (the potato core loses mass, the
reindeer crash) is predicted, observed and explained. A convention (a symbol, a unit, how to draw
a Punnett square, how to name a phase) is told briefly, with no discussion.

**Delayed definition.** A technical word appears only after students have seen the thing it names.
Show the potato cores losing mass, then name osmosis. The word is marked as a glossary term in the
section that teaches it, and appears in that section's heading, not an earlier one.

**Concreteness fading.** One concrete case, then the general case, then the rule: this reindeer
herd, then any population with a limited food supply, then carrying capacity.

**Every example targets a named misconception.** If an example targets none, cut it. A misconception
box states the wrong idea in quotation marks, then what is true, then the evidence.

**Callback closure.** A chapter ends by returning to its opening phenomenon, now explained. A unit
ends by answering the questions on its overview page. The closing heading names the idea, not
the image.

**Say the core rules the same way every time.** Each unit has one key sentence ("Energy flows.
Matter cycles."). It is worded once and repeated in exactly those words. A definition lives in
the glossary and is quoted from there, never re-worded in a chapter.

**Show a wrong version when the right one is not obvious.** Show the plausible wrong answer, mark it
wrong, and give concrete reasons. A student who has seen the wrong version stops producing it.

**Quote a source when a claim contradicts what students were taught before.** An ordinary claim
needs no citation; a surprising one does.

**Cognitive load (Mayer), as review criteria:**

- **Signaling**: headings, bold and callouts point to what matters, and only to that.
- **Segmenting**: a new section starts where the activity changes, not after a set number of
  minutes. The claim that attention lasts ten to fifteen minutes is a myth; do not repeat it.
- **Coherence**: cut interesting material that does not serve a learning target.
- **Redundancy**: do not repeat a fact in two places on one page. (Listen reads the page aloud
  only when a student chooses it, so it does not count as redundant narration.)
- **Expertise reversal**: a scaffold that helps a beginner slows down a student who knows the
  material. Every scaffold has a stated point where it stops.

---

## 6. By format

### Chapter prose

- The first sentence of a paragraph states its point. The rest supports it.
- One idea per paragraph.
- The phenomenon before the term, the example before the rule.
- Headings follow section 2, so the headings alone read as the chapter's outline.
- Nothing about the chapter itself: no "in this chapter we will explore", no "as we saw earlier".
  Name the idea and link to where it is taught.
- Cut a quarter of the first draft. It is almost always possible.

### Callouts

Each callout type has one job. Use the type that matches the job.

| Callout | Job | Rule |
|---|---|---|
| Key idea (`callout-key`) | The one rule to remember | Worded once; repeated in the same words elsewhere. |
| Looking back (`callout-recall`) | A fact from an earlier chapter that this one needs | State the fact and link its chapter. Never "as we saw". |
| Try this (`callout-try`) | A task | Starts with an instruction verb. Answerable by a student working alone. |
| Common misconception (`callout-misconception`) | One wrong idea | The wrong idea in quotation marks, then what is true, then the evidence. |
| Example (`callout-example`) | A worked example | Every step shown; the result stated. |
| Where this goes next (`callout-ahead`) | The next idea | Names the idea and links it. Keep every promise it makes. |
| Note (`callout-note`) | Rarely needed | Never about the course, the sources or the lesson plan. |

### Figures and captions

- The label is `Figure 3.1` (numbered centrally; see `UNIT-BUILD-PROCESS.md`).
- **The caption states what to notice**, not only what the figure is.
- **The alt text describes everything a student would need** if they could not see the image.
  Screen readers, Listen and the slide exporter all use it.
- Outside images carry their credit line in the agreed format. A painting or a model is labeled
  as one ("A painting, not a photograph").

### Glossary definitions

Definitions live in `COURSE.glossary` in `assets/toc.js`, and nowhere else.

- The first sentence defines the term in about 25 words or fewer, and can stand alone on a flash
  card.
- An optional second sentence names the commonest confusion or the limit of the idea.
- Name related glossary terms by their exact glossary names. The word map links definitions to
  each other by finding those names.
- Mark a term with `<span class="term">` in the section that teaches it, and add its definition in
  the same edit. A marked term with no definition fails silently.

### Quick checks (multiple choice)

- Every question has two versions, so a student who reviews sees a new question on return.
- Every wrong option is a real misconception, and its feedback explains why it is wrong.
- The stem uses an instruction verb or a direct question.
- The question links back (`data-review`) to the section that teaches it.

### Check your understanding (written answers)

- The question uses an instruction verb.
- **The model answer is one to three sentences, about 40 words, and the first sentence answers the
  question.** No restated question, no "This is because…". If it runs long, it is two questions.

### Learning targets and standards

- "I can" statements and NGSS wording are quoted **word for word**. Only punctuation may change (an
  em dash becomes a comma, colon or parentheses). NGSS wording keeps its American spelling.
- Each target links to the chapter that teaches it.

### Interactives

- Button and label text follows every rule here. A button starts with a verb: *Check*, *Reset*,
  *Next stage*.
- Feedback states what happened and why, in one or two sentences, without praise words
  ("Great!").
- The interactive asks for a prediction before it shows a result.

### A note on a linked video or reading

Time, task, and what to look for: "Watch 2:10 to 5:30 (4 min). Notice when the vacuole shrinks."
More than one action becomes a numbered list. Do not state the conclusion; leave it to the
student.

### Investigations and lab procedures

- **It is a procedure, not a lesson.** Explain only what the next step needs, at the moment it is
  needed. A bigger idea is linked, not explained inline.
- **State what the student will produce**, as an observable result, and **what they need before
  starting.**
- **Numbered steps, one action each.** A step ends in something the student can observe: "The
  solution turns from blue to brick red."
- **Show the expected result and the common wrong result**, so students recognize both.
- **Put each problem where the student meets it**, at that step: symptom, then cause, then fix.
- **Variables are named with the course's terms**: independent, dependent and controlled
  variables, control group.
- **A procedure is finished when someone has followed it** from start to end and reached the stated
  result.

---

## 7. Integrity

- **Links and your own words only.** Do not copy textbook text, figures or other people's
  materials. A textbook reference is a page number.
- **Outside images and video** are used only with a license that allows it, and carry a credit
  line. No third-party copyrighted image is published.
- **No student names or student work**, anywhere: text, comments, filenames or screenshots.
- **Cite only what you can show.** A claim that sounds authoritative rests on a source you can name.
  If you cannot source it, remove it.
- **No assessment material.** No summatives, no answer keys, no due dates, and nothing that reveals
  a graded task. The word "Summative" does not appear in the reader.
- **The reader stands alone.** A student who missed every lesson can learn from it. No sentence
  depends on a slide, a worksheet or something said in class.

---

## 8. Applying the rules with judgement

Every rule here exists so that a student, often reading in a second language, understands the
biology faster. Use that purpose to decide each case. A rewrite that obeys the rules but reads
worse, or loses a fact, is a failed rewrite.

**Rewrite the sentence, not the symbol.** Replacing every em dash with a comma produces run-on
sentences. Look at what the dash was doing: an aside becomes parentheses or its own sentence; a
list becomes a colon; a contrast becomes two sentences.

**Keep what is doing the teaching.** Concrete cases, real numbers, named scientists and places,
and a clear line of argument are the reader's strengths. Cut padding, not content. A shorter
sentence that drops "usually", "most" or "in humans" has changed the biology.

**Some things are quoted, not written.** Leave these as published: NGSS wording, "I can"
statements, titles of papers and books, quotations, and the names of organizations, species and
diseases. Only punctuation in a learning target may change.

**A technical term is not an idiom.** "Crossing over", "carrying capacity", "trophic cascade" and
"carrier" are the words students must learn, even though they look like phrasal verbs or
metaphors. Keep them, and define them where they are taught.

**The rules apply to the writer's voice, not to what people say.** A misconception box quotes the
wrong idea as students say it ("The giraffes stretched their necks"). People may tell, want and
decide; only cells, genes, organisms and data may not.

**Headings.** Name the idea. A section built on one case study may name the case, with a label:
"Case study: the Pacific robins of Norfolk Island". A question heading is fine when the section
answers exactly that question.

**Change a working page only for a reason.** Clarity, accuracy, a broken rule that affects
reading, or spelling as part of a full chapter rewrite are reasons. Matching this guide word for
word in a sentence that already reads clearly is not.

**Rewrite a chapter in one pass.** Spelling, style, headings and captions together, then check its
links, glossary terms, figure references and quick-check feedback still match. Never run a
find-and-replace across the whole site.

**Keep what the code depends on.** Section ids, figure numbers, `data-*` attributes and glossary
keys stay the same when the words around them change. Text inside interactives lives in
`sims/*.js`; rewrite it there, and run the interactive afterwards.

**When a rule and clarity disagree, clarity wins.** Write down the case in this file, so the next
writer makes the same call.

---

## 9. Before publishing

1. Search for `—` and `&mdash;`. None outside the two exceptions in section 2.
2. Search for every phrase in section 4.
3. Check the spelling is American throughout the page.
4. Read it as someone whose English is their third language. Rewrite anything that needs
   unpacking.
5. Check no cell, gene, organism, species or graph wants, knows, tries, learns or tells.
6. Check every instruction uses an exact verb (state, describe, explain, calculate, predict…).
7. Check every heading names the idea in two to five words.
8. Check every written answer starts with the answer and stays near 40 words.
9. Check every number: calculate it or cite it. Check every claim against section 3, and every
   formula, unit, gene symbol and species name against its notation rules.
10. Check every example and every quiz distractor targets a named misconception.
11. Check nothing is about the course, the lesson, the sources or why it is taught this way.
12. Check every chapter reference is a linked number, and every new term is marked and defined.
13. Cut a quarter of it.

A starting point for steps 1 and 2 (run from the project root):

```
grep -n "—\|&mdash;" chapters/*.html
grep -niE "work(ed)? out|find out|set up|build on|step by step|tells? you|in mind|at a glance|worth (knowing|noticing)|rule of thumb|muddled|astonishing|wants to|learned to" chapters/*.html
```

---

## 10. Changes from the source guide

**Kept as written:** the philosophy, no em dashes, plain international English, no metaphor, no
non-literal phrasal verbs, "things do not speak", exact instruction verbs, one negative, links
where the instruction is, headings that name the idea, the banned-phrase list as a living list,
delayed definition, concreteness fading, misconception targeting, callback closure, identical
wording for core rules, Mayer's principles, the 40-word answer rule, notes on linked resources,
the procedure rules, integrity, and the pre-publishing checklist.

**Translated to this course:**

- PRIMM (a computing framework) became **predict, observe, explain**, which the reader's
  interactives already use, plus **claim, evidence, reasoning** for written explanations.
- "Start from a phenomenon" was added, because NGSS units are built around anchoring phenomena
  and every unit overview already has one.
- Models are treated as a practice, not a metaphor, because *develop and use a model* is an NGSS
  practice.
- "Things do not speak" is ranked first among the sentence rules, because in biology it is also a
  content error (teleology).

**Added for this site:** the reasons plain English matters more here (Translate, Listen, Cards,
Present and Printout), the no-contractions rule, the "not X, it is Y" rule, numbers and units,
checking every number, callout types, figures and alt text, glossary definitions and the word map,
two-version quick checks, verbatim learning targets, interactive text, and the rule that the
reader stands alone.

**Left out:** computer science examples, rules about naming code, the concept-library data file,
and "direct instruction is a minority of the lesson" (a rule for running a class, not for
writing).

**Added after review:** section 3, on scientific accuracy and notation, and section 8, on applying
the rules with judgement rather than mechanically.

**Decided (24 September 2026): American spelling.** The reader was drafted in British spelling
(about 255 uses of "organis-", 150 of "colour", 106 of "fertilis-"), so each chapter is converted
in the same pass as its rewrite. The rule is also recorded in the project's `CLAUDE.md`.
