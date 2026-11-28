// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { isDiagram } from 'didactics/blocks';
import { lessonProblems } from 'didactics/lesson';
import { FIGURES } from '../src/app/figures';
import { FIGURE_IDS, isWritten, LESSONS, type Question } from '../src/core/lessons';
import { isSubjectId } from '../src/core/photos';
import { referenceProblems } from 'didactics/reference';
import { REFERENCE } from '../src/core/reference';
import { DECK } from '../src/app/deck';
import quiz from '../src/data/quiz.json';

describe('lessons', () => {
  it('use only figures and goals that exist', () => {
    expect(lessonProblems(LESSONS, FIGURES)).toEqual([]);
  });

  it('are numbered 1 to n, with unique ids', () => {
    expect(LESSONS.map((l) => l.n)).toEqual(LESSONS.map((_, i) => i + 1));
    expect(new Set(LESSONS.map((l) => l.id)).size).toBe(LESSONS.length);
  });

  it('each end in a check, once written', () => {
    for (const l of LESSONS.filter(isWritten)) {
      const last = l.parts[l.parts.length - 1];
      expect(last.blocks.some((b) => isDiagram(b) && FIGURES[b.id].quiz), l.id).toBe(true);
      expect(l.summary.length, l.id).toBeGreaterThanOrEqual(2);
      expect(l.summary.length, l.id).toBeLessThanOrEqual(5);
    }
  });

  it('have every figure in the list built', () => {
    expect(Object.keys(FIGURES).sort()).toEqual([...FIGURE_IDS].sort());
  });

  it('catch a check or photo block that is wrong', () => {
    const q: Question = { question: 'Which?', options: ['a', 'b'], answer: 2, why: 'Because it is so.', picture: 'mud' };
    expect(FIGURES.check.options?.({ items: [q] })).toHaveLength(2);
    expect(FIGURES.check.options?.({ items: [] })).toEqual(['has no questions']);
    expect(FIGURES.photo.options?.({ subject: 'mud' })).toHaveLength(1);
  });
});

describe('the reference page', () => {
  it('names real lessons, figures and subjects', () => {
    const ids = new Set(LESSONS.map((l) => l.id));
    for (const s of REFERENCE) {
      expect(ids.has(s.lesson ?? ''), s.id).toBe(true);
      for (const b of s.blocks) {
        if (b.type === 'picture') expect(isSubjectId(b.subject), b.subject).toBe(true);
        if (b.type === 'table') for (const r of b.rows) expect(r.length, `${s.id} row ${r[0]}`).toBe(b.columns.length);
      }
    }
    expect(referenceProblems(REFERENCE, { figures: FIGURES, lessons: LESSONS, blocks: ['picture'], glossary: true })).toEqual([]);
  });

  it('has something for every written lesson', () => {
    for (const l of LESSONS.filter(isWritten)) expect(REFERENCE.some((s) => s.lesson === l.id && s.blocks.length), l.id).toBe(true);
  });
});

describe('the quiz deck', () => {
  it('has unique cards about written lessons, with real answers', () => {
    expect(new Set(DECK.map((c) => c.id)).size).toBe(DECK.length);
    const written = new Set(LESSONS.filter(isWritten).map((l) => l.id));
    for (const c of quiz.cards) {
      expect(written.has(c.lesson), c.id).toBe(true);
      expect(c.answer).toBeLessThan(c.options.length);
    }
  });
});
