// The save: Didactics' progress (lessons done, review cards, lessons left part
// way) plus the reader's verdicts, the answers given in each lesson before
// and after its argument, which the Verdicts page reads back. A verdict is
// keyed by the verdict's own key (a lesson's verdict block names it), never
// by position, so lessons can be rewritten without losing answers.

import { createStore } from 'didactics/store';
import { emptyProgress, migrateProgress, type Progress } from 'didactics/progress';

/** One verdict: the choice picked before the argument, after it, and when. */
export interface Verdict {
  before?: number;
  after?: number;
  /** The reason picked with it, if the verdict offers reasons. */
  reason?: number;
  /** When it was last given, in ms since 1970. */
  at: number;
}

export interface PhilosophySave extends Progress {
  verdicts: Record<string, Verdict>;
}

export const emptySave = (): PhilosophySave => ({ ...emptyProgress('metric', { radio: false, fixedUnits: true }), verdicts: {} });

const pick = (v: unknown): number | undefined => (typeof v === 'number' && Number.isInteger(v) && v >= 0 && v < 20 ? v : undefined);

/** Repair a stored save: Didactics' fields, then the verdicts, keeping every one that still makes sense. */
export function migrate(raw: unknown): PhilosophySave {
  const out: PhilosophySave = { ...migrateProgress(raw, emptySave()), verdicts: {} };
  const vs = raw && typeof raw === 'object' ? (raw as { verdicts?: unknown }).verdicts : undefined;
  if (vs && typeof vs === 'object') {
    for (const [key, v] of Object.entries(vs as Record<string, unknown>)) {
      if (!v || typeof v !== 'object') continue;
      const r = v as Record<string, unknown>;
      const verdict: Verdict = { at: typeof r.at === 'number' && Number.isFinite(r.at) ? r.at : 0 };
      if (pick(r.before) !== undefined) verdict.before = pick(r.before);
      if (pick(r.after) !== undefined) verdict.after = pick(r.after);
      if (pick(r.reason) !== undefined) verdict.reason = pick(r.reason);
      if (verdict.before !== undefined || verdict.after !== undefined) out.verdicts[key.slice(0, 60)] = verdict;
    }
  }
  return out;
}

export const store = createStore<PhilosophySave>({ key: 'philosophy.save', empty: emptySave, migrate });

/** Record a choice for a verdict, before or after the argument. */
export function giveVerdict(key: string, when: 'before' | 'after', choice: number, reason?: number): void {
  store.update((s) => {
    const old = s.verdicts[key] ?? { at: 0 };
    const next: Verdict = { ...old, [when]: choice, at: Date.now() };
    if (reason !== undefined) next.reason = reason;
    return { ...s, verdicts: { ...s.verdicts, [key]: next } };
  });
}

/** Forget every verdict (the Verdicts page's reset), keeping the rest of the save. */
export const clearVerdicts = (): void => void store.update((s) => ({ ...s, verdicts: {} }));
