// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest';
import { DRILLS, bytes } from '../src/drills/drills';
import { drillsView, ticked } from '../src/drills/view';
import { LESSONS } from '../src/lessons';
import type { ViewContext } from 'didactics/router';

const ctx = (id?: string) => {
  const went: string[] = [];
  const params: Record<string, string> = id ? { id } : {};
  const c: ViewContext = { params, navigate: (p) => void went.push(p), replace: (p) => void went.push(p) };
  return { went, ctx: c };
};

describe('the design drills', () => {
  beforeEach(() => localStorage.clear());

  it('are eight, each complete, with unique ids', () => {
    expect(DRILLS).toHaveLength(8);
    expect(new Set(DRILLS.map((d) => d.id)).size).toBe(8);
    for (const d of DRILLS) {
      expect(d.prompt.length, d.id).toBeGreaterThan(100);
      expect(d.asks.length, d.id).toBeGreaterThanOrEqual(4);
      expect(d.inputs.length, d.id).toBeGreaterThanOrEqual(3);
      expect(d.covers.length, d.id).toBeGreaterThanOrEqual(6);
      expect(d.followUps.length, d.id).toBeGreaterThanOrEqual(3);
      expect(d.lessons.length, d.id).toBeGreaterThanOrEqual(4);
    }
  });

  it('name lessons that exist and are written', () => {
    for (const d of DRILLS) for (const id of d.lessons) {
      const l = LESSONS.find((x) => x.id === id);
      expect(l, `${d.id}: ${id}`).toBeDefined();
      expect(l!.coming, `${d.id}: ${id}`).toBeFalsy();
    }
  });

  it('start each slider on one of its steps', () => {
    for (const d of DRILLS) for (const i of d.inputs) expect(i.steps, `${d.id}.${i.key}`).toContain(i.value);
  });

  it('give finite estimates at every corner of their sliders', () => {
    for (const d of DRILLS) {
      const corners = d.inputs.reduce<Record<string, number>[]>(
        (acc, i) => acc.flatMap((v) => [{ ...v, [i.key]: i.steps[0] }, { ...v, [i.key]: i.steps[i.steps.length - 1] }]),
        [{}],
      );
      for (const v of corners) {
        const lines = d.estimate(v);
        expect(lines.length, d.id).toBeGreaterThan(0);
        for (const t of lines) expect(t, `${d.id} ${JSON.stringify(v)}`).not.toMatch(/NaN|Infinity|undefined/);
      }
    }
  });

  it('use no dashes as punctuation', () => {
    const text = JSON.stringify(DRILLS.map(({ prompt, asks, covers, followUps, title }) => ({ prompt, asks, covers, followUps, title })));
    expect(text).not.toMatch(/[–—]| - /);
  });

  it('write sizes in readable units', () => {
    expect(bytes(108)).toBe('110 TB');
    expect(bytes(2500)).toBe('2.5 PB');
    expect(bytes(0.5)).toBe('500 GB');
  });

  it('list every drill on the index', () => {
    const root = document.createElement('div');
    drillsView(root, ctx().ctx);
    expect(root.querySelectorAll('.drill-card')).toHaveLength(8);
  });

  it('show one drill, and follow its sliders', () => {
    const root = document.createElement('div');
    drillsView(root, ctx('eval-gate').ctx);
    expect(root.querySelector('h1')?.textContent).toContain('Deciding whether a new model ships');
    const lines = () => root.querySelector('.drill-lines')!.textContent;
    const before = lines();
    const input = root.querySelectorAll('input[type=range]')[1] as HTMLInputElement;
    input.value = '0';
    input.dispatchEvent(new Event('input'));
    expect(lines()).not.toBe(before);
    expect(root.querySelectorAll('.drill-lessons a').length).toBe(5);
  });

  it('keep the reader\'s ticks and notes', () => {
    const root = document.createElement('div');
    drillsView(root, ctx('telemetry').ctx);
    const box = root.querySelector('.drill-covers input') as HTMLInputElement;
    box.checked = true;
    box.dispatchEvent(new Event('change'));
    expect([...ticked('telemetry')]).toEqual([0]);
    const notes = root.querySelector('textarea') as HTMLTextAreaElement;
    notes.value = 'A queue per depot.';
    notes.dispatchEvent(new Event('input'));
    const again = document.createElement('div');
    drillsView(again, ctx('telemetry').ctx);
    expect((again.querySelector('textarea') as HTMLTextAreaElement).value).toBe('A queue per depot.');
    expect((again.querySelector('.drill-covers input') as HTMLInputElement).checked).toBe(true);
  });

  it('send an unknown drill back to the index', () => {
    const root = document.createElement('div');
    const c = ctx('nope');
    drillsView(root, c.ctx);
    expect(c.went).toEqual(['/drills']);
  });
});
