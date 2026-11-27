// @vitest-environment happy-dom
// The figures that are also flash cards (Didactics figure cards): which they
// are, and that each builds as a card from any seed.

import { describe, expect, it } from 'vitest';
import { emptyProgress } from 'didactics/progress';
import { figureCardProblems } from 'didactics/review';
import { FIGURES } from '../src/figures';
import { LESSONS } from '../src/lessons';

globalThis.IntersectionObserver ??= class { observe() {} disconnect() {} } as unknown as typeof IntersectionObserver;

describe('figure cards', () => {
  it('build as cards from any seed', () => {
    expect(figureCardProblems(LESSONS, FIGURES, emptyProgress('metric'), [1, 2, 3, 4, 5, 6, 7, 8])).toEqual([]);
  });
});
