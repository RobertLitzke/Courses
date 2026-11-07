// @vitest-environment happy-dom
// Lesson 14's sand table (models/sandtable): a ridge rising across a river.
// Slow uplift and the river saws a gorge; fast, and it is ponded and goes
// around the ridge's end.
import { describe, expect, it } from 'vitest';
import { emptyProgress } from 'didactics/progress';
import { FIGURES } from '../src/figures';
import { SAW, sawRun } from '../src/figures/rivers';

globalThis.IntersectionObserver ??= class { observe() {} disconnect() {} } as unknown as typeof IntersectionObserver;
const context = () => ({ save: emptyProgress('metric'), closed: new AbortController().signal, score: () => {} });
const setSlider = (node: HTMLElement, n: number, value: number) => {
  const input = node.querySelectorAll('input[type=range]')[n] as HTMLInputElement;
  input.value = String(value);
  input.dispatchEvent(new Event('input'));
};

describe("Powell's saw on the sand table", () => {
  it('cuts through a slowly rising ridge, and is turned aside by a fast one', () => {
    const slow = sawRun(SAW.slow);
    const fast = sawRun(SAW.fast);
    expect(slow.through).toBeGreaterThan(0.5);
    expect(slow.cut).toBeGreaterThan(0.3);
    expect(fast.through).toBeLessThan(0.05);
    expect(fast.around).toBeGreaterThan(0.02);
    expect(fast.lake).toBeGreaterThan(2 * slow.lake);
  }, 30000);

  it('reaches both goals', async () => {
    const a = FIGURES.saw(context(), 'through');
    setSlider(a.node, 0, SAW.stop);
    await expect(a.done).resolves.toBeUndefined();
    const b = FIGURES.saw(context(), 'around');
    setSlider(b.node, 0, SAW.stop);
    await expect(b.done).resolves.toBeUndefined();
  }, 30000);
});
