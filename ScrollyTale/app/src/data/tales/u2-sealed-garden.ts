import type { Tale } from "../../lib/types";

/**
 * Unit 2, the sealed bottle garden.
 *
 * One phenomenon, 35 minutes, the pump-and-sunlight loop in one object.
 * Every evidence beat points at a simulation that already exists in the
 * reader. The tale stores the sim name, never a copy of the sim.
 */
export const sealedGardenTale: Tale = {
  id: "u2-sealed-garden",
  unit: "u2",
  title: "The Sealed Garden",
  subtitle: "Unit 2 · Energy flows and matter cycles",
  drivingQuestion: "What keeps the plant alive in a bottle that has not been opened since 1972?",
  phenomenon:
    "In 1960 David Latimer put compost and a spiderwort seedling into a ten-gallon glass bottle. He added half a pint of water. In 1972 he pushed the bung in tight and has not opened it since. The plant is still alive.",
  budgetMinutes: 35,

  beats: [
    {
      id: "phenomenon",
      kind: "phenomenon",
      eyebrow: "Step 1 of 7 · The phenomenon",
      title: "One bottle, sealed for fifty years",
      prompt:
        "State your explanation. What must be happening inside the bottle for the plant to stay alive with the bung in?",
      helper:
        "Write what you think now. You will change it later. The bottle is a wall to matter and a window to energy.",
      minutes: 3,
      commit: "model",
      source: { chapter: "u2-overview", section: "anchor" },
      readInline: "open",
      omit: ["prompts", "check"],
      concepts: [
        "light", "energy", "matter", "carbon", "water", "air", "cycle",
        "recycl", "photosynthesis", "respiration", "atom", "oxygen", "heat",
      ],
      moves: [
        {
          id: "ask-both-journeys",
          when: "empty",
          say: "Write one sentence. Name what enters the bottle and what stays inside it.",
        },
        {
          id: "ask-carriers",
          when: "thin",
          say: "Name one material that has to be reused inside the bottle. State the molecule it travels in.",
        },
        {
          id: "ask-light-only",
          when: "partial",
          say: "State which of the two, energy or matter, can cross the glass. Explain how you know.",
        },
      ],
      closeEnough:
        "Two ideas are present: something cycles inside, and something arrives from outside.",
      standards: ["HS-LS1-5", "HS-LS2-3"],
      bridges: [
        {
          id: "bridge-reused-not-replaced",
          triggers: ["soil", "food", "eat", "water it", "nutrient"],
          covers: ["matter", "carbon", "cycle", "recycl"],
          frame: "Look for the two things the bottle does that a pot on a windowsill does not.",
          ask:
            "Name one material the bottle reuses. State the molecule it travels in when it leaves the plant.",
          concepts: ["carbon", "carbon dioxide", "oxygen", "water", "matter", "atom"],
          source: { chapter: "u2-carbon-cycle", section: "bottle" },
          omit: ["prompts", "check", "table"],
        },
        {
          id: "bridge-wall-and-window",
          triggers: ["light", "sun", "sunlight", "energy", "heat", "warm"],
          covers: ["matter", "cycle", "recycl"],
          frame: "Look at what the glass lets through and what it stops.",
          ask:
            "State one thing that crosses the glass and one thing that cannot. Explain what makes them different.",
          concepts: ["light", "heat", "energy", "matter", "atom", "glass"],
          source: { chapter: "u2-carbon-cycle", section: "bottle" },
          omit: ["prompts", "check", "table"],
        },
      ],

    },

    {
      id: "tracker",
      kind: "evidence",
      eyebrow: "Step 2 of 7 · Evidence",
      title: "Sort what the bottle holds",
      prompt:
        "Complete the tracker. Then state one item inside the bottle that is matter and one that is energy.",
      helper:
        "Run each row of the tracker before you answer. The tracker names the same molecules the bottle uses.",
      minutes: 7,
      commit: "observation",
      source: { chapter: "u2-energy-matter", section: "two-things" },
      readInline: "collapsed",
      sim: {
        key: "u2-energy-tracker",
        title: "Energy and matter tracker",
        task: "Classify each item, then follow one transfer through the bottle",
      },
      concepts: ["matter", "energy", "light", "heat", "bond", "carbon", "water", "atom", "conserv"],
      moves: [
        {
          id: "ask-mass-test",
          when: "empty",
          say: "Complete one row first, then answer. Matter has mass. Energy has no mass.",
        },
        {
          id: "ask-bond",
          when: "thin",
          say: "Name the molecule that carries energy from one reaction to another. State what changes in it.",
        },
        {
          id: "ask-conservation",
          when: "partial",
          say: "State what happens to the total amount of matter and to the total amount of energy. Use one sentence for each.",
        },
      ],
      closeEnough:
        "You separate matter from energy and name where each one goes.",
      standards: ["HS-LS1-5"],
      bridges: [
        {
          id: "bridge-light-is-not-heat",
          triggers: ["thermal", "heat", "convert", "absorb", "warm", "temperature"],
          covers: ["matter", "bond", "carbon", "energy"],
          frame: "Look for where the energy sits after the leaf has taken the light in.",
          ask:
            "Name the molecule a leaf builds from carbon dioxide and water. State which part of that molecule holds the energy.",
          concepts: ["glucose", "sugar", "bond", "chemical", "carbon dioxide", "water"],
          source: { chapter: "u2-energy-matter", section: "bonds" },
          omit: ["prompts", "check"],
        },
        {
          id: "bridge-mass-or-not",
          triggers: ["oxygen", "air", "gas", "leaves"],
          covers: ["matter", "energy", "atom"],
          frame: "Look for the difference between a thing you could weigh and a thing you could not.",
          ask:
            "Name one item inside the bottle that has mass and one item that has no mass. State how you told them apart.",
          concepts: ["matter", "mass", "carbon", "water", "energy", "light"],
          source: { chapter: "u2-energy-matter", section: "two-things" },
          omit: ["prompts", "check"],
        },
      ],

    },

    {
      id: "arrows",
      kind: "evidence",
      eyebrow: "Step 3 of 7 · Evidence",
      title: "Draw the arrows that stop",
      prompt:
        "Sort each arrow as matter or energy. Then predict what changes in the bottle when the light stops.",
      helper:
        "Two of the arrows carry molecules and two carry energy. The direction of each arrow shows which is which.",
      minutes: 6,
      commit: "observation",
      source: { chapter: "u2-rate", section: "limiting" },
      readInline: "collapsed",
      sim: {
        key: "u2-model-arrows",
        title: "Model the arrows",
        task: "Name every arrow, sort it, then predict the effect of more light",
      },
      concepts: [
        "matter", "energy", "light", "carbon dioxide", "oxygen", "water",
        "heat", "arrow", "stop", "respiration", "photosynthesis",
      ],
      moves: [
        {
          id: "ask-direction",
          when: "empty",
          say: "Name the four arrows before you answer. The direction of an arrow shows which way the material or the energy travels.",
        },
        {
          id: "ask-carrier",
          when: "thin",
          say: "Compare the two carrier arrows. State the molecule each one carries.",
        },
        {
          id: "ask-dark",
          when: "partial",
          say: "State which arrows stop in the dark and which keep going. Explain the one that keeps going.",
        },
      ],
      closeEnough:
        "You name the arrow that keeps running without light, and explain it.",
      standards: ["HS-LS1-5", "HS-LS1-7"],
      bridges: [
        {
          id: "bridge-what-runs-in-the-dark",
          triggers: ["stop", "dark", "night", "nothing", "all stop"],
          covers: ["respiration", "heat", "oxygen"],
          frame: "Look for the arrow that is still active when the light is off.",
          ask:
            "Name the arrow that keeps running without light, and state what it produces.",
          concepts: ["respiration", "oxygen", "carbon dioxide", "water", "heat"],
          source: { chapter: "u2-rate", section: "limiting" },
          omit: ["prompts", "check"],
        },
        {
          id: "bridge-carriers",
          triggers: ["arrow", "carrier", "atp", "nadh", "sort"],
          covers: ["matter", "energy"],
          frame: "Look at the direction of each carrier arrow. Two of them go opposite ways.",
          ask:
            "Name the two carrier molecules and state the direction each one travels.",
          concepts: ["atp", "nadph", "adp", "nadp", "carrier"],
          source: { chapter: "u2-photosynthesis", section: "handover" },
          omit: ["prompts", "check"],
        },
      ],

    },

    {
      id: "revision",
      kind: "revision",
      eyebrow: "Step 4 of 7 · Revision",
      title: "Change your explanation",
      prompt:
        "Revise your explanation of the bottle. State what cycles and state what flows. Use the words matter and energy.",
      helper:
        "Read your first explanation before you write. Keep the part that still holds. Replace the part that does not.",
      minutes: 5,
      commit: "revision",
      source: { chapter: "u2-energy-matter", section: "conservation" },
      readInline: "open",
      omit: ["prompts", "check"],
      concepts: ["matter", "cycle", "energy", "flow", "heat", "light", "atom", "recycl", "transfer"],
      moves: [
        {
          id: "ask-two-sentences",
          when: "empty",
          say: "Write two sentences. The first states what cycles. The second states what flows.",
        },
        {
          id: "ask-self-compare",
          when: "thin",
          say: "Compare your first explanation with this one. State the sentence you changed and why.",
        },
        {
          id: "ask-prediction",
          when: "partial",
          say: "Predict what happens to the plant in a dark cupboard. Use the same two ideas.",
        },
      ],
      closeEnough:
        "One sentence says matter is reused. One sentence says energy arrives and leaves.",
      standards: ["HS-LS1-5", "HS-LS2-3"],
      bridges: [
        {
          id: "bridge-where-carbon-goes",
          triggers: ["food", "eat", "soil", "feed"],
          covers: ["matter", "cycle", "atom", "recycl"],
          frame: "Look for what happens to the carbon after the plant has built it into a leaf.",
          ask:
            "A leaf falls to the compost. State where its carbon goes next, and which organisms move it.",
          concepts: ["decompos", "bacteria", "fungi", "respiration", "carbon dioxide", "carbon"],
          source: { chapter: "u2-carbon-cycle", section: "processes" },
          omit: ["prompts", "check", "table"],
        },
        {
          id: "bridge-flow-not-store",
          triggers: ["store", "stores", "saved", "keeps the energy"],
          covers: ["energy", "flow", "heat"],
          frame: "Look for what leaves the system on every transfer, and whether it can return.",
          ask:
            "State what leaves the bottle as a result of every transfer, and why the bottle needs a new supply.",
          concepts: ["heat", "energy", "flow", "light", "sun"],
          source: { chapter: "u2-energy-matter", section: "conservation" },
          omit: ["prompts", "check"],
        },
      ],

    },

    {
      id: "recall",
      kind: "recall",
      eyebrow: "Step 5 of 7 · Recall",
      title: "Without looking",
      prompt:
        "State where the carbon in the plant came from, and where the energy came from. Answer before you open your earlier model.",
      helper:
        "Your earlier model is hidden until you answer. Rebuilding it from memory is what makes it stay.",
      minutes: 4,
      commit: "retrieval",
      source: { chapter: "u2-carbon-cycle", section: "atoms" },
      concepts: [
        "carbon", "air", "atmosphere", "carbon dioxide", "photosynthesis",
        "respiration", "light", "sun", "heat", "decompos", "cycle",
      ],
      moves: [
        {
          id: "ask-without-looking",
          when: "empty",
          say: "Answer from memory first. A partial answer is more useful than a copied one.",
        },
        {
          id: "ask-one-journey",
          when: "thin",
          say: "Follow one carbon atom. State the molecule it leaves the air in. State the molecule it returns in.",
        },
        {
          id: "ask-energy-origin",
          when: "partial",
          say: "State the original source of the energy, and state the form it leaves the bottle in.",
        },
      ],
      closeEnough:
        "You name carbon dioxide and the sun, and say heat leaves.",
      standards: ["HS-LS2-3", "HS-LS2-5"],
    },

    {
      id: "transfer",
      kind: "transfer",
      eyebrow: "Step 6 of 7 · Transfer",
      title: "A case with no light",
      prompt:
        "A sealed compost heap warms up on its own and shrinks in volume over a year. No light reaches it. Explain what cycles and what flows in the heap.",
      helper:
        "The heap has no photosynthesis. Everything you claimed about the bottle still has to hold.",
      minutes: 4,
      commit: "transfer",
      source: { chapter: "u2-carbon-cycle", section: "processes" },
      readInline: "open",
      omit: ["prompts", "check", "table"],
      concepts: [
        "cycle", "flow", "heat", "matter", "energy", "decompos", "bacteria",
        "oxygen", "closed", "respiration", "carbon", "water",
      ],
      moves: [
        {
          id: "ask-heat-source",
          when: "empty",
          say: "State the process that releases the heat. Name the organisms that run it.",
        },
        {
          id: "ask-volume",
          when: "thin",
          say: "The heap loses volume but the matter does not leave. State where the mass goes.",
        },
        {
          id: "ask-transfer-check",
          when: "partial",
          say: "Compare the heap with the bottle. State one thing the two systems share and one thing they do not.",
        },
      ],
      closeEnough:
        "You explain the heat as energy leaving, and the lost volume as gas leaving.",
      standards: ["HS-LS2-3", "HS-LS2-4"],
      bridges: [
        {
          id: "bridge-no-light-still-heat",
          triggers: ["cold", "no energy", "cannot", "dark", "shade"],
          covers: ["heat", "respiration", "bacteria"],
          frame: "Look for what the organisms in the heap release as they break the material down.",
          ask:
            "State what the bacteria release as they break the heap down, and where that leaves the heap.",
          concepts: ["heat", "carbon dioxide", "water", "respiration", "energy"],
          source: { chapter: "u2-carbon-cycle", section: "processes" },
          omit: ["prompts", "check", "table"],
        },
        {
          id: "bridge-volume-lost",
          triggers: ["shrink", "volume", "less", "disappear", "smaller"],
          covers: ["cycle", "matter", "carbon"],
          frame: "Look for the form the lost mass leaves in.",
          ask:
            "The heap is smaller but the matter did not vanish. State the form the mass left in.",
          concepts: ["gas", "carbon dioxide", "water", "vapour", "atmosphere"],
          source: { chapter: "u2-carbon-cycle", section: "processes" },
          omit: ["prompts", "check", "table"],
        },
      ],

    },

    {
      id: "snapshot",
      kind: "snapshot",
      eyebrow: "Step 7 of 7 · Snapshot",
      title: "Save your model",
      prompt:
        "State the two ideas you will carry into Unit 3. Write each one as a sentence you could use again.",
      helper:
        "This snapshot is what Unit 3 recalls before it explains anything new.",
      minutes: 4,
      commit: "snapshot",
      source: { chapter: "u2-overview", section: "overview" },
      readInline: "collapsed",
      concepts: ["matter", "energy", "cycle", "flow", "heat", "light", "conserv", "ecosystem"],
      moves: [
        {
          id: "ask-two-ideas",
          when: "empty",
          say: "Write the two sentences. One for matter. One for energy.",
        },
        {
          id: "ask-reuse",
          when: "thin",
          say: "State where each idea will be used again. Name a system that is not a bottle.",
        },
      ],
      closeEnough: "Two sentences, one about matter and one about energy.",
      standards: ["HS-LS1-5", "HS-LS2-3"],
    },
  ],
};
