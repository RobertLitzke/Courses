// @vitest-environment happy-dom
// The verdict figure and the Verdicts page: answers are saved under their
// key, an old or broken save keeps what it can, keys are unique across the
// course, and the hand-written tensions name real choices.
import { beforeEach, describe, expect, it } from 'vitest';
import { FIGURES } from '../src/figures';
import { WRITTEN } from '../src/lessons';
import { emptySave, migrate, store } from '../src/store';
import { TENSIONS } from '../src/tensions';
import { askedVerdicts, triggered, verdictsView } from '../src/verdicts-page';
import { click, context } from './helpers';

const options = (key: string) => askedVerdicts().find((a) => a.options.key === key)?.options;

describe('verdicts', () => {
  beforeEach(() => store.set(emptySave()));

  it('have unique keys across the written lessons', () => {
    const keys = askedVerdicts().filter((a) => !a.options.again).map((a) => a.options.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys.length).toBeGreaterThanOrEqual(WRITTEN.length);
  });

  it('save the answer once it is locked in, and finish the task', async () => {
    const o = options('euthyphro')!;
    const h = FIGURES.verdict(context(), 'answer', o as never);
    click(h.node, o.choices[1]);
    click(h.node, 'Lock it in');
    await expect(h.done).resolves.toBeUndefined();
    expect(store.get().verdicts.euthyphro.before).toBe(1);
  });

  it('come back already answered on a later visit', async () => {
    const o = options('ring')!;
    store.update((s) => ({ ...s, verdicts: { ring: { before: 0, at: 1 } } }));
    const h = FIGURES.verdict(context(), 'answer', o as never);
    await expect(h.done).resolves.toBeUndefined();
    expect(h.node.textContent).toContain('Change my answer');
  });

  it('survive a broken save', () => {
    const s = migrate({ verdicts: { ok: { before: 2, at: 5 }, bad: { before: -1 }, worse: 'x', after: { after: 1, reason: 99 } } });
    expect(s.verdicts).toEqual({ ok: { before: 2, at: 5 }, after: { after: 1, at: 0 } });
    expect(migrate(null).verdicts).toEqual({});
  });

  it('pair up in tensions only on real choices', () => {
    for (const t of TENSIONS) {
      for (const side of [t.a, t.b]) {
        const o = options(side.key);
        if (!o) continue; // a lesson not written yet
        for (const p of side.picks) expect(p, `${side.key}`).toBeLessThan(o.choices.length);
      }
    }
  });

  it('show a tension on the Verdicts page once both answers are in', () => {
    store.update((s) => ({ ...s, verdicts: { ring: { before: 0, at: 1 }, 'ring-happier': { before: 0, at: 2 } } }));
    expect(triggered().length).toBe(1);
    const root = document.createElement('div');
    verdictsView(root, { params: {}, navigate: () => {}, replace: () => {} });
    expect(root.textContent).toContain('pull against each other');
    click(root, 'Forget all my verdicts');
    expect(store.get().verdicts).toEqual({});
  });
});

describe('the dialogue', () => {
  it('runs to its end', async () => {
    const b = WRITTEN.flatMap((l) => l.parts.flatMap((p) => p.blocks)).find((x) => 'id' in x && x.id === 'dialogue') as { options: { turns: unknown[] } } | undefined;
    expect(b).toBeDefined();
    const h = FIGURES.dialogue(context(), 'end', b!.options as never);
    for (let k = 0; k < b!.options.turns.length; k++) {
      const chip = h.node.querySelector('.fig-controls button.chip') as HTMLButtonElement;
      chip.dispatchEvent(new Event('click'));
    }
    await expect(h.done).resolves.toBeUndefined();
  });
});

describe('the cave', () => {
  it('steps through to the way back down', async () => {
    const h = FIGURES.cave(context(), 'out');
    for (let k = 0; k < 4; k++) click(h.node, 'Next');
    await expect(h.done).resolves.toBeUndefined();
  });
});

import { evolve, mixOf, matchScore } from '../src/figures/dilemma';

describe('the prisoner\'s dilemma figure', () => {
  it('scores a one-off meeting by the payoffs', () => {
    expect(matchScore('defect', 'coop', 1)).toBe(5);
    expect(matchScore('tft', 'tft', 10)).toBe(3);
    expect(matchScore('tft', 'defect', 10)).toBeCloseTo(0.9);
  });
  it('lets defectors take over when pairs meet once, and tit for tat when they meet often', () => {
    const once = evolve(mixOf(30), 1).at(-1)!;
    const often = evolve(mixOf(30), 10).at(-1)!;
    expect(once.defect).toBeGreaterThan(0.9);
    expect(often.tft).toBeGreaterThan(0.5);
  });
});

import { HARSANYI, RAWLS, SOCIETIES } from '../src/figures/veil';

describe('the veil of ignorance', () => {
  it('has the two rules pick different societies, neither of them Equal', () => {
    expect(SOCIETIES[RAWLS].name).toBe('Lifted floor');
    expect(SOCIETIES[HARSANYI].name).toBe('Top-heavy');
  });
  it('is done once the reader is placed and has seen both rules', async () => {
    const h = FIGURES.veil(context(), 'compare');
    click(h.node, 'Wide');
    click(h.node, 'Lift the veil');
    expect(h.node.textContent).toContain('You were born into the');
    click(h.node, 'Rawls: the best worst-off');
    click(h.node, 'Harsanyi: the best average');
    await expect(h.done).resolves.toBeUndefined();
  });
});

import { readLedger } from '../src/figures/ledger';

describe('the ledger in the last lesson', () => {
  beforeEach(() => store.set(emptySave()));
  it('says so when there are no verdicts yet', () => {
    const h = FIGURES.ledger(context());
    expect(h.node.textContent).toContain('not given any verdicts yet');
  });
  it('counts answers with the majority, changes of mind and tensions', () => {
    const verdicts = {
      theism: { before: 0, at: 1 },
      switch: { before: 0, at: 1 },
      footbridge: { before: 1, at: 1 },
      mind: { before: 0, after: 1, at: 1 },
    };
    store.update((s) => ({ ...s, verdicts }));
    const r = readLedger(verdicts);
    expect(r.answered).toBe(5);
    expect(r.changed).toHaveLength(1);
    const h = FIGURES.ledger(context());
    expect(h.node.textContent).toContain('Where you changed your mind');
    expect(h.node.textContent).toContain('would pull the switch but not push');
  });
});

import { degree } from '../src/figures/heap';
import { guess, setSlider } from './helpers';

describe('the heap', () => {
  it('rises smoothly from false to true', () => {
    expect(degree(1)).toBeLessThan(0.05);
    expect(degree(10000)).toBeGreaterThan(0.95);
    expect(degree(50)).toBeLessThan(degree(100));
  });
  it('is done once every theory is seen in the borderline zone', async () => {
    const h = FIGURES.heap(context(), 'borderline');
    await Promise.resolve();
    guess(h.node, 'There is no exact point');
    setSlider(h.node, 0, 9); // 100 grains
    for (const name of ['Degrees of truth', 'Supervaluation', 'Epistemicism']) click(h.node, name);
    await expect(h.done).resolves.toBeUndefined();
  });
});
