// @vitest-environment happy-dom
// The sand-table figures (models/sandtable): a dam on a river (lesson 4), a
// shower on a divide (lesson 1), a drift cell (lesson 14) and the Duwamish's
// flats (S3). Each goal is reachable, and each model does what its lesson says.
import { describe, expect, it } from 'vitest';
import { FIGURES } from '../src/figures';
import { coastRun } from '../src/figures/beach';
import { flatsRun, FLATS } from '../src/figures/duwamish';
import { DAM, damRun } from '../src/figures/sediment';
import { crestAt, showerGoes } from '../src/figures/watershed';
import { click, context, guess, setSlider } from './helpers';

const build = (id: string, goal?: string) => {
  let done = false;
  const h = FIGURES[id](context(), goal);
  void h.done?.then(() => (done = true));
  return { node: h.node, done: async () => { await Promise.resolve(); await Promise.resolve(); return done; } };
};

describe('a dam on the sand table', () => {
  it('traps sand in its lake and starves the delta; taken out, it lets the sand through', () => {
    const none = damRun('none');
    const stays = damRun('stays');
    const out = damRun('out');
    expect(stays.behind).toBeGreaterThan(2);
    expect(stays.delta).toBeLessThan(none.delta / 2);
    expect(out.behind).toBeLessThan(stays.behind / 2);
    expect(out.delta).toBeGreaterThan(none.delta * 0.7);
  }, 30000);

  it('reaches both goals', async () => {
    const a = build('sediment-table', 'trap');
    setSlider(a.node, 0, DAM.end);
    expect(await a.done()).toBe(true);
    const b = build('sediment-table', 'release');
    setSlider(b.node, 0, DAM.end);
    expect(await b.done()).toBe(true);
  }, 30000);
});

describe('a shower on the divide', () => {
  it('runs west to the Sound from one side of the crest and east from the other', () => {
    const w = showerGoes(Math.round(crestAt(18)) - 20, 18);
    const e = showerGoes(Math.round(crestAt(18)) + 20, 18);
    expect(w.west).toBeGreaterThan(0.3);
    expect(w.east).toBe(0);
    expect(e.east).toBeGreaterThan(0.3);
    expect(e.west).toBe(0);
  }, 20000);

  it('reaches its goal from two taps', async () => {
    const f = build('watershed-table', 'both');
    document.body.append(f.node);
    const canvas = f.node.querySelector('canvas')!;
    canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 96, height: 60, right: 96, bottom: 60, x: 0, y: 0, toJSON: () => ({}) });
    const tap = (i: number, j: number) => canvas.dispatchEvent(new MouseEvent('pointerdown', { clientX: i + 0.5, clientY: j + 0.5 }));
    tap(Math.round(crestAt(18)) - 20, 18);
    setSlider(f.node, 0, 70);
    tap(Math.round(crestAt(18)) + 20, 18);
    setSlider(f.node, 0, 70);
    expect(await f.done()).toBe(true);
    f.node.remove();
  }, 20000);
});

describe('a drift cell on the sand table', () => {
  it('piles the sand at the down-drift end, whichever way the waves come', () => {
    const w = coastRun('west');
    const e = coastRun('east');
    expect(w.east).toBeGreaterThan(2 * w.west);
    expect(e.west).toBeGreaterThan(2 * e.east);
  }, 30000);

  it('reaches its goal after a guess', async () => {
    const f = build('beach-table', 'downdrift');
    guess(f.node, 'Piled up at the east end');
    setSlider(f.node, 0, 120);
    expect(await f.done()).toBe(true);
  }, 20000);
});

describe("the Duwamish's flats", () => {
  it('drop the river\'s mud over the flats, and the waterway drops it in the turning basin', () => {
    const flats = flatsRun('flats');
    const waterway = flatsRun('waterway');
    const share = (r: { head: number; rest: number }) => r.head / (r.head + r.rest);
    expect(share(waterway)).toBeGreaterThan(2 * share(flats));
  }, 30000);

  it('reaches its goal on the waterway', async () => {
    const f = build('duwamish-flats', 'basin');
    click(f.node, 'Waterway (1920)');
    setSlider(f.node, 0, FLATS.end);
    expect(await f.done()).toBe(true);
  }, 20000);
});
