// Settings' per-lesson downloads (Didactics' lessonPieces, as main.ts asks for
// them): each lesson's piece names files that exist, and the code of the
// figures it shows with the src/core model behind each.

import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { lessonPieces } from 'didactics/course';
import { FIGURES } from '../src/app/figures';
import { LESSONS } from '../src/core/lessons';

const modules = import.meta.glob<Record<string, unknown>>('/src/app/figures/*.ts', { eager: true });

describe('lesson pieces', () => {
  it('has one per lesson, each with its lesson file and its figure code', () => {
    const pieces = lessonPieces({
      lessons: LESSONS, figures: FIGURES, modules,
      files: (l) => [`src/data/lessons/${l.id}.json`],
      alongside: (file) => [file.replace('src/app/figures/', 'src/core/')],
      fileName: (l) => `clouds-${l.id}.json`,
    });
    expect(pieces).toHaveLength(LESSONS.length);
    for (const p of pieces) {
      for (const f of p.files) expect(existsSync(f), f).toBe(true);
      expect(p.code!.length, p.label).toBeGreaterThan(0);
    }
    const fog = pieces.find((p) => p.fileName === 'clouds-fog.json')!;
    expect(fog.label).toBe(`Lesson 1: ${LESSONS[0].title}`);
    expect(fog.code).toContain('src/app/figures/fog.ts');
    expect(pieces.find((p) => p.fileName === 'clouds-seeding.json')!.code).toContain('src/core/seeding.ts');
  });
});
