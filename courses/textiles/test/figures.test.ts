// @vitest-environment happy-dom
// Every figure the lessons name builds, in both unit systems. Each lesson's
// own figure tests (goals reachable, exported maths against known numbers)
// are in test/<lesson id>.test.ts, with the helpers in test/helpers.ts.
import { describe, expect, it } from 'vitest';
import { isDiagram } from 'didactics/blocks';
import { FIGURES } from '../src/figures';
import { WRITTEN } from '../src/lessons';
import { context } from './helpers';

describe('every figure', () => {
  it('builds in metric and imperial', () => {
    for (const units of ['metric', 'imperial'] as const) {
      for (const l of WRITTEN) {
        for (const b of l.parts.flatMap((p) => p.blocks)) {
          if (!isDiagram(b) || b.id === 'photo') continue;
          const f = FIGURES[b.id];
          expect(f, `${l.id}: ${b.id}`).toBeDefined();
          const h = f(context(units), b.goal, b.options);
          expect(h.node, `${l.id}: ${b.id}`).toBeTruthy();
        }
      }
    }
  });
});
