// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { lessonProblems, lessonShapeProblems } from 'didactics/lesson';
import { treeProblems } from 'didactics/tree';
import { FIGURES } from '../src/figures';
import { BRANCHES, LESSONS, WRITTEN } from '../src/lessons';

describe('the lessons', () => {
  it('are well formed', () => {
    expect(WRITTEN.flatMap((l) => lessonShapeProblems(l, l.id))).toEqual([]);
  });

  it('make a sound tree', () => {
    expect(treeProblems(LESSONS, BRANCHES)).toEqual([]);
  });

  it('end with a summary of two to five takeaways, and a check', () => {
    for (const l of WRITTEN) {
      expect(l.summary.length, l.id).toBeGreaterThanOrEqual(2);
      expect(l.summary.length, l.id).toBeLessThanOrEqual(5);
      const last = l.parts[l.parts.length - 1];
      expect(last.blocks.some((b) => b.type === 'quiz' && b.id === 'check'), l.id).toBe(true);
    }
  });

  it('name figures that exist, with goals they know', () => {
    expect(lessonProblems(WRITTEN, FIGURES, { allowPlaceholders: false })).toEqual([]);
  });

  it('use no dashes as punctuation', () => {
    for (const l of WRITTEN) {
      const text = JSON.stringify(l);
      expect(text.match(/[^\d\s]\s?[—–]\s?[^\d\s]/g) ?? [], l.id).toEqual([]);
    }
  });
});
