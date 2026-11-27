import { describe, expect, it } from 'vitest';
import { emptySave, finishLesson, migrate } from '../src/core/save';

describe('migrate', () => {
  it('turns junk into an empty save', () => {
    expect(migrate(null)).toEqual(emptySave());
    expect(migrate('x')).toEqual(emptySave());
    expect(migrate([1, 2])).toEqual(emptySave());
  });

  it('keeps what is valid and repairs the rest', () => {
    const s = migrate({
      name: 'Rob',
      units: 'metric',
      shifts: { floors: { done: true, best: 12, of: 8, finishedAt: '2026-10-19' }, bad: 'x' },
    });
    expect(s.name).toBe('Rob');
    expect(s.units).toBe('metric');
    expect(s.lessons.floors).toEqual({ done: true, best: 8, of: 8, finishedAt: '2026-10-19' });
    expect(s.lessons.bad).toBeUndefined();
  });

  it('carries the old first lesson over to the one it ended up in', () => {
    const s = migrate({ shifts: { textures: { done: true, best: 5, of: 6, finishedAt: '2026-10-19' } } });
    expect(s.lessons.textures).toBeUndefined();
    expect(s.lessons.heaps).toBeUndefined();
    expect(s.lessons.fog).toEqual({ done: true, best: 5, of: 6, finishedAt: '2026-10-19' });
  });

  it('folds lessons that were merged into the one that took them in', () => {
    const rec = { done: true, best: 4, of: 6, finishedAt: '2026-10-22' };
    const s = migrate({ shifts: { 'seeding-limits': rec, heaps: rec, fog: { done: true, best: 6, of: 6 } } });
    expect(s.lessons.seeding).toEqual(rec);
    expect(s.lessons.fog).toEqual({ done: true, best: 6, of: 6 });
    expect(s.lessons['seeding-limits']).toBeUndefined();
    expect(s.lessons.heaps).toBeUndefined();
  });

  it('reads lesson records saved under either name', () => {
    const rec = { done: true, best: 3, of: 6 };
    expect(migrate({ lessons: { fog: rec } }).lessons.fog).toEqual(rec);
    expect(migrate({ shifts: { fog: rec } }).lessons.fog).toEqual(rec);
    expect(migrate({ orders: ['a', 'a', 2] }).orders).toEqual(['a']);
  });

  it('loads a save from when the course had radio talks, dropping their fields', () => {
    const rec = { done: true, best: 3, of: 6 };
    const s = migrate({ talk: false, introSeen: true, heard: { intro: [1, 2] }, lessons: { fog: rec } });
    expect(s.lessons.fog).toEqual(rec);
    expect('talk' in s || 'introSeen' in s || 'heard' in s).toBe(false);
  });
});

describe('finishLesson', () => {
  const now = new Date('2026-10-19T12:00:00Z');

  it('records a first finish with its date, and drops the journal older saves kept', () => {
    const s = finishLesson(emptySave(), 'floors', 6, 8, now);
    expect(s.lessons.floors).toEqual({ done: true, best: 6, of: 8, finishedAt: '2026-10-19' });
    expect(migrate({ journal: ['floors'], lessons: s.lessons })).not.toHaveProperty('journal');
  });

  it('keeps the better score and the first date', () => {
    const first = finishLesson(emptySave(), 'floors', 7, 8, now);
    const worse = finishLesson(first, 'floors', 3, 8, new Date('2026-10-20T12:00:00Z'));
    expect(worse.lessons.floors.best).toBe(7);
    expect(worse.lessons.floors.finishedAt).toBe('2026-10-19');
    const better = finishLesson(worse, 'floors', 8, 8, now);
    expect(better.lessons.floors.best).toBe(8);
  });
});
