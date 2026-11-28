// Every lesson, written or to come, and the branches of the lesson tree.
// Written lessons are JSON in src/lessons/; the rest are listed here as
// "coming", so the home page shows the whole plan. The plan is Rob's outline
// v2 in the project files (textiles/outline-v2-rob.md, 27 Nov 2026).

import type { Lesson } from 'didactics/lesson';
import { lessonCodes, type TreeBranch, type TreeLesson } from 'didactics/tree';

export type TextilesLesson = Lesson & TreeLesson;

const written = import.meta.glob<TextilesLesson>('./lessons/*.json', { eager: true, import: 'default' });

/** A lesson not written yet: its place in the tree and what it will answer. */
export const coming = (id: string, n: number, title: string, teaches: string, more: Partial<TextilesLesson> = {}): TextilesLesson =>
  ({ id, n, title, teaches, parts: [], coming: true, summary: [], ...more });

const m = (id: string, n: number, title: string, teaches: string, needs = ['fibres']) => coming(id, n, title, teaches, { branch: 'wardrobe', needs });
const k = (id: string, n: number, title: string, teaches: string, needs = ['structure']) => coming(id, n, title, teaches, { branch: 'structures', needs });
const w = (id: string, n: number, title: string, teaches: string, needs = ['africa']) => coming(id, n, title, teaches, { branch: 'traditions', needs });
const f = (id: string, n: number, title: string, teaches: string, needs = ['structure']) => coming(id, n, title, teaches, { branch: 'fashion', needs });

const COMING: TextilesLesson[] = [
  // Part I: how cloth is made
  coming('string', 1, 'Why did Neanderthals make string?', 'The four layers of any cloth (fibre, yarn, structure, finish), why twist holds fibres together, S and Z twist, and plying'),
  coming('fibres', 2, 'Why does wool itch and silk shine?', 'Flax, wool, cotton and silk; plant against animal fibre; staple length, crimp and scales; preparing fibre; how each was domesticated'),
  coming('spinning', 3, 'How long did it take to spin a sail?', 'Drafting, the spindle and the wheel, yarn count, and why spinning was the slowest step and mostly women\'s work'),
  coming('structure', 4, 'Why do jeans hold their shape while T-shirts stretch?', 'Woven and knitted cloth: warp and weft, plain, twill and satin weaves, the four-shaft draft, and why loops stretch'),
  coming('dye', 5, 'Why does colour wash out?', 'Why most dyes fade, mordants and madder, indigo\'s vat chemistry, and printing with mordants and resists'),
  // Part II: cloth and the world
  coming('purple', 6, 'Why was purple reserved for emperors?', 'Tyrian purple and its cost, and sumptuary laws from Rome and Byzantium to Ming China, Edo Japan, the Ottomans and Tudor England'),
  coming('silk', 7, 'How long did China keep silk to itself?', 'Sericulture, silk as Han currency and tribute, the myths of the secret and the single road, and the land and sea routes'),
  coming('pattern', 8, 'How did Han weavers store a pattern?', 'Pattern shafts as stored instructions, the Laoguanshan looms, figured silk, and the drawloom'),
  coming('words', 9, 'Why are so many cloth words Arabic and Persian?', 'Cotton across the Islamic world, tiraz workshops, the cloth cities behind English words, and Turkey red'),
  coming('wool', 10, 'How did sheep pay for a war?', 'The medieval wool trade from England to Flanders and Florence, Edward III\'s wool scheme, the Staple, guilds and fulling mills'),
  coming('inca', 11, 'How did the Inca run an empire on cloth?', 'Cloth as state wealth, cumbi and awasqa, tribute and storehouses, the khipu, and the obrajes and cochineal after the conquest'),
  coming('calico', 12, 'Why did England ban Indian cotton?', 'India\'s lead in fine spinning and fast colour, cloth for spices, the monsoon trade, the calico craze and the Calico Acts'),
  coming('africa', 13, 'Why did African buyers decide what Manchester made?', 'West African cloth industries, cloth currencies, exacting buyers, and cloth in the Atlantic slave trade'),
  coming('bottleneck', 14, 'Why did a faster shuttle cause a yarn famine?', 'The flying shuttle, the spinning bottleneck, the machines that failed, and the jenny, water frame and mule'),
  coming('mill', 15, 'What was a factory day like?', 'Water-powered mills, shifts and locked gates, women and children at work, the power loom, and the Luddites'),
  coming('why-britain', 16, 'Why did the machines come to Lancashire and not Bengal?', 'Historians disagree: wages and coal, colonies, Indian competition, and a culture of useful knowledge'),
  coming('gin', 17, 'How did a machine to clean cotton expand slavery?', 'Upland cotton and the saw gin, Indian Removal, the domestic slave trade, and the debate over slavery and industrial capitalism'),
  coming('jacquard', 18, 'How did a loom learn to read?', 'Jacquard\'s punched cards, the Lyon silk weavers, and what Babbage, Lovelace and Hollerith took from them'),
  coming('king-cotton', 19, 'Why didn\'t cotton save the Confederacy?', 'King Cotton diplomacy, the glut, the embargo and blockade, the Lancashire cotton famine, and cotton from India and Egypt'),
  coming('mauve', 20, 'How did a failed malaria cure end natural dyes?', 'Perkin\'s mauve, coal-tar dyes, synthetic alizarin and indigo, and the end of madder fields and indigo plantations'),
  coming('khadi', 21, 'Why did Gandhi spin every day?', 'India\'s mills and handlooms, the deindustrialisation debate, swadeshi, and homespun cloth as politics'),
  coming('toyoda', 22, 'How did a loom company become Toyota?', 'Japan\'s silk exports, the Tomioka mill and its women workers, Osaka\'s cotton mills, and Toyoda\'s automatic loom'),
  coming('synthetics', 23, 'Why did 40,000 people queue for stockings?', 'Rayon from wood pulp, polymers, nylon and polyester, and why synthetic does not simply mean worse'),
  coming('sizes', 24, 'When did clothes start coming in sizes?', 'The sewing machine, ready-to-wear, men\'s and women\'s sizes, garment districts and the Triangle fire'),
  coming('fast', 25, 'Why is a T-shirt cheaper than a sandwich?', 'Trade quotas and their end, Bangladesh\'s garment industry, short-cycle fashion, Rana Plaza, and who gets the price of a shirt'),
  coming('resources', 26, 'Who decides where cotton is grown, and where clothes go to die?', 'The Aral Sea, Xinjiang, Bt cotton, subsidies and the Cotton-4, second-hand exports, microfibres, and which numbers to trust'),
  coming('label', 27, 'What does the label in your shirt not say?', 'The whole course applied to a garment you own, a 1930s rayon dress and a wax-print shirt'),

  // Branch M: your wardrobe (off lesson 2)
  m('shrink', 101, 'Why does wool shrink in a hot wash?', 'Scales, felting and why superwash wool does not; cashmere and merino'),
  m('wrinkle', 102, 'Why does linen wrinkle and polyester spring back?', 'What holds a fibre\'s shape, and what an iron and steam undo'),
  m('warm', 103, 'What makes down and fleece warm?', 'Still air, loft and wicking'),
  m('thread-count', 104, 'What does thread count measure?', 'Threads per inch, how plied yarns inflate the number, and pile cloths such as velvet and towelling', ['fibres', 'structure']),
  m('stretch', 105, 'How does stretch fabric spring back?', 'Knitted loops against elastane, and why stretch wears out', ['fibres', 'structure']),
  m('rain', 106, 'How can a jacket be waterproof and breathable?', 'From Macintosh\'s rubber (1823) to Gore-Tex (1976), and Kwolek\'s Kevlar'),
  m('recycled', 107, 'What does recycled polyester fix?', 'Polyester from bottles, and why clothes are rarely made back into clothes'),
  // Branch K: other structures (off lesson 4)
  k('felt', 201, 'How is felt made without spinning or weaving?', 'Wool scales locking under heat, wet and pressure'),
  k('lace', 202, 'Why did lace cost as much as silk?', 'Bobbin and needle lace and the hours in each'),
  k('bayeux', 203, 'Why is the Bayeux Tapestry not a tapestry?', 'Embroidery, tapestry weaving and how the Bayeux hanging was stitched'),
  k('stocking-frame', 204, 'Who built the first knitting machine?', 'William Lee\'s stocking frame (1589 by tradition) and the framework knitters who became Luddites'),
  // Branch W: cloth traditions (off lesson 13)
  w('kente', 301, 'How is kente woven?', 'West African strip weaving, kente and Yoruba adire resist dyeing'),
  w('aizome', 302, 'Why is Japanese indigo so deep?', 'Aizome, boro patching and kimono built from loom-width cloth'),
  w('navajo', 303, 'How did Navajo weavers make the churro blanket?', 'Navajo weaving, churro sheep and the trading-post rug'),
  w('carpets', 304, 'How is a Persian carpet knotted?', 'Knotted pile, knot density and the hours in a carpet'),
  w('paisley', 305, 'How did a Kashmir shawl give Paisley its name?', 'Pashmina, Kashmir twill tapestry shawls and the European imitations'),
  // Branch F: fashion and form (off lesson 4)
  f('cut', 401, 'When did clothes start to fit the body?', 'Draped cloth that keeps the loom\'s rectangle against cut and tailored cloth from the 14th century'),
  f('denim', 402, 'How did workwear twill become denim?', 'Genoa and Nîmes, indigo warp that fades, and the 1873 rivet patent'),
  f('wax-print', 403, 'How did Dutch wax prints become West African fashion?', 'Machine-made batik, a lost Javanese market and the West African buyers who made the cloth their own', ['structure', 'africa']),
  f('suit', 404, 'Why did men give up silk for wool?', 'Beau Brummell, tailoring and quiet fit as a new kind of status', ['structure', 'mill']),
  f('corsets', 405, 'What do skeletons say about corsets?', 'Corsets and crinolines as engineering, and the evidence against the rib myths', ['structure', 'sizes']),
  f('utility', 406, 'Why did the state set the length of a hem?', 'Britain\'s Utility clothing scheme of 1941 and cloth rationing', ['structure', 'sizes']),
  f('styles', 407, 'Why do styles change at all?', 'Trickle-down and trickle-up, conspicuous leisure, and why fast turnover needs cheap cloth', ['structure', 'fast']),
];

/** The branches: the reader's own wardrobe, other structures, cloth traditions, and fashion. */
export const BRANCHES: TreeBranch[] = [
  { id: 'wardrobe', title: 'Your wardrobe', promise: 'Shrinking, wrinkles, warmth, thread count, stretch and rain', from: 'fibres', kind: 'hands-on', color: 'var(--b-violet)', prefix: 'M' },
  { id: 'structures', title: 'Other structures', promise: 'Felt, lace, embroidery and the first knitting machine', from: 'structure', kind: 'further', color: 'var(--b-gold)', prefix: 'K' },
  { id: 'traditions', title: 'Cloth traditions', promise: 'Kente, Japanese indigo, Navajo weaving, Persian carpets and Kashmir shawls', from: 'africa', kind: 'people', color: 'var(--b-clay)', prefix: 'W' },
  { id: 'fashion', title: 'Fashion and form', promise: 'Cut and fit, denim, wax prints, the suit, corsets, rationing and why styles change', from: 'structure', kind: 'people', color: 'var(--b-madder)', prefix: 'F' },
];

/** How many lessons the trunk has: "Lesson 3 of 27". */
export const TRUNK = 27;

const done = Object.values(written);
const ids = new Set(done.map((l) => l.id));
const all = [...done, ...COMING.filter((l) => !ids.has(l.id))].sort((a, b) => a.n - b.n);
const codes = lessonCodes(all, BRANCHES);

/** Every lesson in tree order, each with its code ("3", "M2"). */
export const LESSONS: readonly TextilesLesson[] = all.map((l) => ({ ...l, code: l.branch ? codes.get(l.id) : undefined }));

/** The lessons that are written. */
export const WRITTEN: readonly TextilesLesson[] = LESSONS.filter((l) => !l.coming);

/** A lesson by id. */
export const lessonById = (id: string): TextilesLesson | undefined => LESSONS.find((l) => l.id === id);
