// @vitest-environment happy-dom
// Lesson 1, How does a bat fly in the dark?
import { describe, expect, it } from 'vitest';
import { isDiagram } from 'didactics/blocks';
import { FIGURES } from '../src/figures';
import { echoes, flights, touches } from '../src/figures/dark';
import { WRITTEN } from '../src/lessons';
import { click, context, guess } from './helpers';

/** A block's options from this lesson (the same live chart may be in other lessons too). */
const own = (id: string) => {
  const b = WRITTEN.find((l) => l.id === 'dark')!.parts.flatMap((p) => p.blocks).find((x) => isDiagram(x) && x.id === id);
  return b && isDiagram(b) ? b.options : undefined;
};

describe('lesson 1: dark', () => {
  it('a bat needs both voice and ears; its eyes do not matter in the dark', () => {
    const none = { eyes: false, ears: false, mouth: false };
    expect(echoes(none)).toBe(true);
    expect(echoes({ ...none, eyes: true })).toBe(true);
    expect(echoes({ ...none, ears: true })).toBe(false);
    expect(echoes({ ...none, mouth: true })).toBe(false);
    expect(touches({ ...none, eyes: true })).toBeLessThan(6);
    expect(touches({ ...none, ears: true })).toBeGreaterThan(15);
    expect(touches({ ...none, mouth: true })).toBeGreaterThan(15);
    expect(flights(none)).toEqual(flights(none));
  });

  it('the wire room is done once each sense has been taken away on its own', async () => {
    const f = FIGURES['wire-room'](context(), 'senses');
    for (const n of ['Eyes covered', 'Ears plugged', 'Mouth tied shut']) {
      click(f.node, n);
      click(f.node, n);
    }
    await expect(f.done).resolves.toBeUndefined();
  });

  it('the clue board leaves hearing its own calls', async () => {
    const f = FIGURES['clue-board'](context(), 'clues', own('clue-board'));
    guess(f.node, 'Hearing its own calls');
    for (const c of ['Show clue 1: Blinded', 'Show clue 2: Ears plugged', 'Show clue 3: Mouth tied']) click(f.node, c);
    expect(f.node.querySelector('.fig-readout')!.textContent).toMatch(/Only one idea fits/);
    await expect(f.done).resolves.toBeUndefined();
  });

  it('the experiments go in order', async () => {
    const o = own('timeline-live')!;
    const f = FIGURES['timeline-live'](context(), 'order', o);
    const events = (o.events as { at: number; label: string }[]).slice().sort((a, b) => a.at - b.at);
    for (const e of events) {
      const chip = [...f.node.querySelectorAll('.chip')].find((c) => c.textContent === e.label)!;
      chip.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    }
    await expect(f.done).resolves.toBeUndefined();
  });
});
