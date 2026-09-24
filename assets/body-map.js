/* =============================================================
   BODY MAP — which organ the course teaches, and where
   -------------------------------------------------------------
   Registers window.BODY_MAP. One source for three consumers: the
   Body Index page, and the 3D organ interactives in 1.3 and 1.5,
   which use it to offer "also covered in" links from whatever
   organ the reader has clicked. Colours live here too, so an organ
   cannot be one colour on the index and another in a chapter.

   `where` is [chapterId, sectionId, label]. Every entry is checked
   against the real chapters by scripts/check-body-map.js — a link
   into a section that does not exist is worse than no link.

   `only` marks an organ the course mentions but does not teach;
   an empty `where` means it is not covered at all. Both are stated
   rather than hidden, because this is an index of a course that is
   not an anatomy course.

   `sex` marks the reproductive organs that belong to one body. The
   Body Index shows one set at a time behind a Female / Male switch;
   everything without `sex` is shared. The male set is BodyParts3D
   4.0 (a male adult reference with no female organs in it). The
   female set is the Human Reference Atlas (HuBMAP, from the Visible
   Human female), placed into the same space by matching the two
   bladders' centres — both datasets are real-scale millimetres, so
   no scaling was needed. See MORNING-NOTES.md.
   ============================================================= */
(function () {
    'use strict';
    const SYSTEMS = {
        digestive:   { label: 'Digestive',   hex: 0xc27a4e },
        circulatory: { label: 'Circulatory', hex: 0xb03a45 },
        respiratory: { label: 'Respiratory', hex: 0x5d87a8 },
        urinary:     { label: 'Urinary',     hex: 0xd0a63c },
        nervous:     { label: 'Nervous',     hex: 0x8a72b5 },
        reproductive: { label: 'Reproductive', hex: 0x7a9a86 }
    };

    // Reproductive colours pair the two systems by job: the gonads are teal
    // (ovary, testis), the tubes yellow-green (oviduct, urethra), the uterus
    // and prostate green, so the parallels show when switching between them.
    const ORGANS = [
        { id: 'esophagus', name: 'Oesophagus', sys: 'digestive', hex: 0xc98b6b,
          where: [['u1-digestion', 'why', 'The tube, drawn as a system']] },
        { id: 'stomach', name: 'Stomach', sys: 'digestive', hex: 0xc4575d,
          where: [['u1-digestion', 'structure', 'A stomach wall'],
                  ['u1-digestion', 'evidence', 'The case of poor protein digestion']] },
        { id: 'small-intestine', name: 'Small intestine', sys: 'digestive', hex: 0xd99a4e,
          where: [['u1-digestion', 'structure', 'A villus'],
                  ['u1-surface-area', 'consequences', 'Why the gut is folded']] },
        { id: 'large-intestine', name: 'Large intestine', sys: 'digestive', hex: 0x8f9e5a,
          where: [['u1-digestion', 'why', 'The tube, drawn as a system'],
                  ['u1-surface-area', 'water', 'Water, aquaporins and why diarrhoea kills']] },
        { id: 'liver', name: 'Liver', sys: 'digestive', hex: 0x9c5b4a,
          where: [['u1-systems-together', 'routes', 'Two doors out of a villus'],
                  ['u1-homeostasis', 'negative', 'Negative feedback, and what breaks in diabetes']] },
        { id: 'pancreas', name: 'Pancreas', sys: 'digestive', hex: 0xb58a55,
          where: [['u1-digestion', 'chemistry', 'Who does what: the chemical work'],
                  ['u1-homeostasis', 'negative', 'Negative feedback, and what breaks in diabetes']],
          note: 'Taught twice, in two units, because it belongs to two systems.' },
        { id: 'gallbladder', name: 'Gall bladder', sys: 'digestive', hex: 0x6f8f5c,
          where: [['u1-digestion', 'chemistry', 'Who does what: the chemical work']] },
        { id: 'heart', name: 'Heart', sys: 'circulatory', hex: 0xb03a45,
          where: [['u1-systems-together', 'systems', 'Eleven systems, one body']] },
        { id: 'aorta', name: 'Aorta', sys: 'circulatory', hex: 0xc0505c,
          where: [['u1-systems-together', 'routes', 'Two doors out of a villus']] },
        { id: 'right-lung', name: 'Right lung', sys: 'respiratory', hex: 0x7ba2c4,
          where: [['u1-what-is-alive', 'models', 'Models: useful and wrong at the same time']],
          only: 'The lungs appear as a worked example of a model, not as taught anatomy. Gas exchange itself is covered as chemistry in Unit 2.' },
        { id: 'left-lung', name: 'Left lung', sys: 'respiratory', hex: 0x6f97ba,
          where: [['u1-what-is-alive', 'models', 'Models: useful and wrong at the same time']],
          only: 'The lungs appear as a worked example of a model, not as taught anatomy.' },
        { id: 'trachea', name: 'Trachea', sys: 'respiratory', hex: 0x9db8cf,
          where: [['u1-what-is-alive', 'models', 'Models: useful and wrong at the same time']],
          only: 'Mentioned in passing. The course does not teach the airway in its own right.' },
        { id: 'diaphragm', name: 'Diaphragm', sys: 'respiratory', hex: 0xa8626a,
          where: [['u1-systems-together', 'systems', 'Eleven systems, one body']],
          note: 'Respiratory and muscular at once — which is the reason it is in that section.' },
        { id: 'right-kidney', name: 'Right kidney', sys: 'urinary', hex: 0xd0a63c,
          where: [['u1-systems-together', 'routes', 'Egestion is not excretion']] },
        { id: 'left-kidney', name: 'Left kidney', sys: 'urinary', hex: 0xc79c33,
          where: [['u1-systems-together', 'routes', 'Egestion is not excretion']] },
        { id: 'right-ureter', name: 'Right ureter', sys: 'urinary', hex: 0xdcb861,
          where: [['u1-systems-together', 'routes', 'Egestion is not excretion']] },
        { id: 'left-ureter', name: 'Left ureter', sys: 'urinary', hex: 0xdcb861,
          where: [['u1-systems-together', 'routes', 'Egestion is not excretion']] },
        { id: 'bladder', name: 'Bladder', sys: 'urinary', hex: 0xe0c477,
          where: [['u1-systems-together', 'routes', 'Egestion is not excretion']] },
        { id: 'brain', name: 'Brain', sys: 'nervous', hex: 0x9d85c6,
          where: [['u1-systems-together', 'gutbrain', 'The gut is also a sense organ']] },
        { id: 'spinal-cord', name: 'Spinal cord', sys: 'nervous', hex: 0xb3a0d4,
          where: [], only: 'Not covered. The course reaches the nervous system only through the gut–brain axis.' },
        { id: 'testis', name: 'Testes', sys: 'reproductive', hex: 0x2f8f9d,
          where: [['u4-gametogenesis', 'anatomy', 'The two systems, part by part'],
                  ['u4-gametogenesis', 'gametogenesis', 'Where the gametes are actually made']], sex: 'male' },
        { id: 'epididymis', name: 'Epididymis', sys: 'reproductive', hex: 0x86c1b6,
          where: [['u4-gametogenesis', 'anatomy', 'The two systems, part by part']], sex: 'male' },
        { id: 'seminal-vesicle', name: 'Seminal vesicles', sys: 'reproductive', hex: 0x93a94a,
          where: [['u4-gametogenesis', 'anatomy', 'The two systems, part by part']], sex: 'male' },
        { id: 'prostate', name: 'Prostate', sys: 'reproductive', hex: 0x4f9a63,
          where: [['u4-gametogenesis', 'anatomy', 'The two systems, part by part']], sex: 'male' },
        { id: 'urethra', name: 'Urethra', sys: 'reproductive', hex: 0xc2cf6e,
          where: [['u4-gametogenesis', 'anatomy', 'The two systems, part by part']],
          sex: 'male',
          note: 'In males it carries both urine and semen. The female urethra carries only urine and is not in this model.' },
        { id: 'ovary', name: 'Ovaries', sys: 'reproductive', hex: 0x2f8f9d, sex: 'female',
          where: [['u4-gametogenesis', 'anatomy', 'The two systems, part by part'],
                  ['u4-feedback', 'cycle', 'The ovarian and menstrual cycles']],
          note: 'Look closely: the ovary is not joined to the oviduct. An egg crosses a small gap to reach it.' },
        { id: 'oviduct', name: 'Oviducts', sys: 'reproductive', hex: 0xc2cf6e, sex: 'female',
          where: [['u4-gametogenesis', 'anatomy', 'The two systems, part by part'],
                  ['u4-gametogenesis', 'fertilisation', 'What happens when they meet']],
          note: 'Also called the fallopian tubes. Fertilisation normally happens here.' },
        { id: 'uterus', name: 'Uterus', sys: 'reproductive', hex: 0x4f9a63, sex: 'female',
          where: [['u4-gametogenesis', 'anatomy', 'The two systems, part by part'],
                  ['u4-feedback', 'cycle', 'The ovarian and menstrual cycles']],
          note: 'Shown with the cervix, its narrow lower end. The vagina is not in this model.' }
    ];

    const byId = {};
    ORGANS.forEach(o => { byId[o.id] = o; });
    window.BODY_MAP = { systems: SYSTEMS, organs: ORGANS, byId: byId };
})();
