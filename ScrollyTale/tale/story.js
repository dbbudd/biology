/**
 * Inquiry steps. Each step points at a real reader chapter.
 * `lead` is shortened from that chapter's own opening, not a second textbook.
 * Shape 0 is the single pulsing molecule. Later shapes are what the question opens into.
 */
export const READER = "../../";

export const SEED = "What is a molecule?";

export const STEPS = [
  {
    shape: 0,
    title: "One molecule",
    prompt: "What is a molecule?",
    lead: "Everything you are made of came out of your mouth as food. This chapter follows the six carbon atoms of one glucose molecule into a fat and into an amino acid.",
    sourceId: "u1-molecules",
    sourceTitle: "1.8 The Molecules of Life",
  },
  {
    shape: 1,
    title: "What it is made of",
    prompt: "What is a molecule made of?",
    lead: "Atoms go round. Energy passes straight through. This chapter is about why those two behave so differently, and about the one place energy is kept: inside a chemical bond.",
    sourceId: "u2-energy-matter",
    sourceTitle: "2.1 Energy, Matter and the Bonds Between",
  },
  {
    shape: 2,
    title: "Shape decides the job",
    prompt: "Why does the shape of a molecule matter?",
    lead: "Starch, protein, and fat are all built the same way: a small unit, repeated. The shape of that chain is what decides the job.",
    sourceId: "u1-molecules",
    sourceTitle: "1.8 The Molecules of Life",
  },
  {
    shape: 3,
    title: "A boundary made of molecules",
    prompt: "How do molecules become a cell's edge?",
    lead: "A cell membrane separates a cell from its surroundings. Water, oxygen, and nutrients cross it, and many other substances cannot. What crosses depends on how the membrane is built.",
    sourceId: "ch01-cell-membrane",
    sourceTitle: "1.1 The Cell Membrane",
  },
  {
    shape: 4,
    title: "Many jobs, one cell",
    prompt: "How does a cell do more than one thing?",
    lead: "Chapter 1.1 stayed inside one membrane. This chapter asks the question that should have come first: what, exactly, was that membrane keeping alive?",
    sourceId: "u1-what-is-alive",
    sourceTitle: "1.2 What Is Alive, and How Is It Built?",
  },
  {
    shape: 5,
    title: "The same atoms, later",
    prompt: "Where does the matter go?",
    lead: "Energy runs out as it moves through an ecosystem. Atoms do not. This chapter follows them back, including how a carbon atom gets from a giraffe into a tree.",
    sourceId: "u2-carbon-cycle",
    sourceTitle: "2.8 Matter Cycles: Carbon Among the Spheres",
  },
];
