// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { lessonProblems, lessonShapeProblems } from 'didactics/lesson';
import { FIGURES } from '../src/figures';
import { WRITTEN as LESSONS } from '../src/lessons';

describe('the lessons', () => {
  it('are well formed', () => {
    expect(LESSONS.flatMap((l) => lessonShapeProblems(l, l.id))).toEqual([]);
  });

  it('end with a summary of two to five takeaways', () => {
    for (const l of LESSONS) {
      expect(l.summary.length, l.id).toBeGreaterThanOrEqual(2);
      expect(l.summary.length, l.id).toBeLessThanOrEqual(5);
    }
  });

  it('name figures that exist, with goals they know', () => {
    // Drop allowPlaceholders once every diagram is drawn.
    expect(lessonProblems(LESSONS, FIGURES, { allowPlaceholders: false })).toEqual([]);
  });
});
