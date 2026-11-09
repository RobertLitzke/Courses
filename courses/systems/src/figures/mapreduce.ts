// Lesson 8, Rebuilding the index on machines that fail: a MapReduce job
// played as a time lapse on twenty workers (a slow machine, a killed worker,
// backup tasks), the inverted index built by map, shuffle and reduce, and
// the paper's terabyte sort as a JSON scale chart.

import { svg } from 'didactics/dom';
import { label, line, redraw, small, still } from 'didactics/draw';
import { COL, figure, frame, named, player, slider, tint, toggles } from './kit';

export interface JobSetup {
  workers?: number;
  maps?: number;
  reduces?: number;
  /** Seconds one map task takes on a healthy machine. */
  mapS?: number;
  /** Seconds one reduce task takes (fetching its share and writing it out). */
  reduceS?: number;
  /** One machine runs `slowFactor` times slower (a disk failing slowly). */
  slow?: boolean;
  slowFactor?: number;
  /** A worker dies at this time, s; null for none. */
  killAt?: number | null;
  /** Near the end of each phase, idle workers run spare copies of tasks still running. */
  backups?: boolean;
}

export type Fate = 'done' | 'killed' | 'lost' | 'cancelled';

/** One copy of one task on one worker. */
export interface TaskRun {
  worker: number;
  kind: 'map' | 'reduce';
  task: number;
  start: number;
  end: number;
  fate: Fate;
  /** A spare copy started near the end of a phase. */
  backup: boolean;
}

export interface Job {
  runs: TaskRun[];
  /** When the last reduce task finished, s. */
  finish: number;
  /** When the last map task finished, s. */
  mapsDone: number;
  /** Worker seconds spent on every copy, and on the copies that were stopped because the other copy won. */
  spent: number;
  wasted: number;
}

/** The slow machine, and the one that dies (row numbers from 0). */
export const SLOW_WORKER = 12;
export const KILLED_WORKER = 6;

/**
 * A MapReduce job on a few workers, event by event: an idle worker takes the
 * next map task; reduce tasks start once every map is done (each needs a
 * piece of every map's output); with backups, a worker with nothing left to
 * take starts a second copy of a task still running, and whichever copy ends
 * first counts. A killed worker's running task and its finished map tasks
 * (their output was on its own disk) go back on the list.
 */
export function runJob(o: JobSetup = {}): Job {
  const W = o.workers ?? 20;
  const M = o.maps ?? 200;
  const R = o.reduces ?? 100;
  const mapS = o.mapS ?? 3;
  const reduceS = o.reduceS ?? 3;
  const slowF = o.slow ? o.slowFactor ?? 20 : 1;
  const killAt = o.killAt ?? null;
  const backups = o.backups ?? false;
  const speed = (w: number) => (w === SLOW_WORKER ? slowF : 1);

  const mapState: ('pending' | 'running' | 'done')[] = Array(M).fill('pending');
  const redState: ('pending' | 'running' | 'done')[] = Array(R).fill('pending');
  const alive = Array(W).fill(true);
  const runs: TaskRun[] = [];
  const running: TaskRun[] = [];
  let t = 0;
  let killed = false;
  let mapsDone = NaN;

  const busy = (w: number) => running.some((r) => r.worker === w);
  const start = (w: number, kind: 'map' | 'reduce', task: number, backup: boolean) => {
    const r: TaskRun = { worker: w, kind, task, start: t, end: t + (kind === 'map' ? mapS : reduceS) * speed(w), fate: 'done', backup };
    runs.push(r);
    running.push(r);
    (kind === 'map' ? mapState : redState)[task] = 'running';
  };
  const assign = () => {
    for (let w = 0; w < W; w++) {
      if (!alive[w] || busy(w)) continue;
      const m = mapState.indexOf('pending');
      if (m >= 0) {
        start(w, 'map', m, false);
        continue;
      }
      const allMaps = mapState.every((s) => s === 'done');
      if (allMaps) {
        const r = redState.indexOf('pending');
        if (r >= 0) {
          start(w, 'reduce', r, false);
          continue;
        }
      }
      if (!backups) continue;
      // Nothing left to take in this phase: copy a task that is running on one worker only.
      const kind = allMaps ? 'reduce' : 'map';
      const lone = running
        .filter((r) => r.kind === kind && r.worker !== w && running.filter((q) => q.kind === kind && q.task === r.task).length === 1)
        .sort((a, b) => a.start - b.start)[0];
      if (lone) start(w, kind, lone.task, true);
    }
  };

  for (let guard = 0; guard < 10000; guard++) {
    assign();
    if (redState.every((s) => s === 'done')) break;
    const nextEnd = Math.min(...running.map((r) => r.end));
    const killNow = killAt !== null && !killed && killAt <= nextEnd;
    if (!Number.isFinite(nextEnd) && !killNow) break;
    if (killNow) {
      t = killAt!;
      killed = true;
      alive[KILLED_WORKER] = false;
      for (const r of running.filter((q) => q.worker === KILLED_WORKER)) {
        r.end = t;
        r.fate = 'killed';
        running.splice(running.indexOf(r), 1);
        const st = r.kind === 'map' ? mapState : redState;
        if (!running.some((q) => q.kind === r.kind && q.task === r.task)) st[r.task] = 'pending';
      }
      // Finished map output lived on the dead machine's disk: do it again, unless no reduce needs it any more.
      if (!redState.every((s) => s === 'done')) {
        for (const r of runs) {
          if (r.worker === KILLED_WORKER && r.kind === 'map' && r.fate === 'done' && r.end <= t) {
            r.fate = 'lost';
            if (!runs.some((q) => q !== r && q.kind === 'map' && q.task === r.task && q.fate === 'done' && q.worker !== KILLED_WORKER)) mapState[r.task] = 'pending';
          }
        }
      }
      continue;
    }
    t = nextEnd;
    for (const r of running.filter((q) => q.end <= t)) {
      if (!running.includes(r)) continue; // stopped already, as the other copy of a task that just finished
      running.splice(running.indexOf(r), 1);
      const st = r.kind === 'map' ? mapState : redState;
      if (st[r.task] === 'done') {
        r.fate = 'cancelled';
        continue;
      }
      st[r.task] = 'done';
      r.fate = 'done';
      // The other copy is stopped.
      for (const q of running.filter((q) => q.kind === r.kind && q.task === r.task)) {
        q.end = t;
        q.fate = 'cancelled';
        running.splice(running.indexOf(q), 1);
      }
    }
    if (Number.isNaN(mapsDone) && mapState.every((s) => s === 'done')) mapsDone = t;
  }
  const spent = runs.reduce((s, r) => s + (r.end - r.start), 0);
  const wasted = runs.filter((r) => r.fate === 'cancelled').reduce((s, r) => s + (r.end - r.start), 0);
  return { runs, finish: t, mapsDone, spent, wasted };
}

const W = 420;
const H = 268;
const AXIS_MAX = 125;

export const FIGS = {
  'mapreduce-job': figure(['backup'], (ctx, t) => {
    const f = frame(W, H, 3);
    const g = svg('g');
    f.svg.append(g);
    let now = 0;
    let set = { slow: true, kill: false, backups: false };
    let job = runJob({ slow: set.slow, killAt: set.kill ? 25 : null, backups: set.backups });
    const x0 = 64;
    const x1 = W - 12;
    const top = 26;
    const rowH = 10.5;
    const X = (s: number) => x0 + (Math.min(s, AXIS_MAX) / AXIS_MAX) * (x1 - x0);

    const paint = () => {
      const parts: SVGElement[] = [];
      parts.push(small(x0 - 5, 12, 'Worker', { soft: true, anchor: 'end' }), small(x0 + 4, 12, `time ${Math.round(now)} s`));
      for (let w = 0; w < 20; w++) {
        const y = top + w * rowH;
        const name = w === SLOW_WORKER && set.slow ? 'slow disk' : w === KILLED_WORKER && set.kill ? 'dies' : `${w + 1}`;
        parts.push(small(x0 - 5, y + 8, name, { anchor: 'end', soft: !(w === SLOW_WORKER && set.slow) && !(w === KILLED_WORKER && set.kill), fill: (w === SLOW_WORKER && set.slow) || (w === KILLED_WORKER && set.kill) ? COL.error : undefined }));
        parts.push(line(x0, y + rowH - 0.5, x1, y + rowH - 0.5, COL.grid, 0.6));
      }
      for (const r of job.runs) {
        if (r.start >= now) continue;
        const y = top + r.worker * rowH + 1;
        const end = Math.min(r.end, now);
        const finished = r.end <= now;
        const col = r.kind === 'map' ? COL.request : COL.write;
        const bad = finished && (r.fate === 'killed' || r.fate === 'lost');
        const gone = finished && r.fate === 'cancelled';
        const attrs: Record<string, string | number> = {
          x: X(r.start) + 0.6, y, width: Math.max(0.8, X(end) - X(r.start) - 1.2), height: rowH - 3, rx: 1.5,
          fill: gone ? COL.paper : bad ? tint(COL.error, 0.35) : r.backup ? tint(col, 0.45) : col,
          stroke: bad ? COL.error : gone ? COL.soft : col, 'stroke-width': 0.8,
        };
        if (gone) attrs['stroke-dasharray'] = '2 1.5';
        parts.push(svg('rect', attrs));
      }
      // Time axis.
      const ay = top + 20 * rowH + 4;
      parts.push(line(x0, ay, x1, ay, COL.ink, 1));
      for (let s = 0; s <= AXIS_MAX; s += 20) parts.push(line(X(s), ay, X(s), ay + 3, COL.ink, 1), small(X(s), ay + 13, `${s}`, { anchor: 'middle', soft: true }));
      parts.push(small(x1, ay + 25, 'seconds', { anchor: 'end', soft: true }));
      parts.push(line(X(now), top - 4, X(now), ay, COL.ink, 1, { 'stroke-dasharray': '2 2' }));
      if (now >= job.finish) parts.push(line(X(job.finish), top - 8, X(job.finish), ay, COL.answer, 2), label(X(job.finish) + (job.finish > 90 ? -4 : 4), top - 10, `done at ${Math.round(job.finish)} s`, { fill: COL.answer, size: 'small', anchor: job.finish > 90 ? 'end' : undefined }));
      // Key.
      const ky = ay + 25;
      parts.push(
        svg('rect', { x: x0, y: ky - 7, width: 10, height: 7, fill: COL.request }), small(x0 + 14, ky, 'map'),
        svg('rect', { x: x0 + 46, y: ky - 7, width: 10, height: 7, fill: COL.write }), small(x0 + 60, ky, 'reduce'),
        svg('rect', { x: x0 + 104, y: ky - 7, width: 10, height: 7, fill: tint(COL.request, 0.45) }), small(x0 + 118, ky, 'backup copy'),
        svg('rect', { x: x0 + 184, y: ky - 7, width: 10, height: 7, fill: tint(COL.error, 0.35), stroke: COL.error, 'stroke-width': 0.8 }), small(x0 + 198, ky, 'lost'),
      );
      redraw(g, ...parts);

      const maps = job.runs.filter((r) => r.kind === 'map' && r.fate === 'done' && r.end <= now).length;
      const reds = job.runs.filter((r) => r.kind === 'reduce' && r.fate === 'done' && r.end <= now).length;
      const extra = Math.round((job.wasted / job.spent) * 100);
      f.readout.textContent = now >= job.finish
        ? `The job finished at ${Math.round(job.finish)} s. A healthy run takes ${Math.round(runJob().finish)} s. ${set.backups ? `Copies stopped because the other copy won took ${extra}% of the worker time.` : 'Backup tasks are off.'}`
        : `At ${Math.round(now)} s: ${maps} of 200 map tasks and ${reds} of 100 reduce tasks done.${now >= job.mapsDone ? ' Every map is done, so the reduces can run.' : ' Reduces wait for every map.'}`;
      if (t.goal === 'backup' && set.slow && set.backups && now >= job.finish) t.done();
    };

    const time = slider('Time', 0, AXIS_MAX, 0.5, 0, (v) => `${Math.round(v)} s`, (v) => { now = v; paint(); }, 'clock');
    const play = player(time, ctx, { seconds: 14 });
    const chips = named(toggles(['A slow machine', 'A worker dies at 25 s', 'Backup tasks'], [set.slow, set.kill, set.backups], (on) => {
      set = { slow: on[0], kill: on[1], backups: on[2] };
      job = runJob({ slow: set.slow, killAt: set.kill ? 25 : null, backups: set.backups });
      paint();
    }), 'Run with:');
    f.controls.append(chips.node, play.node, time.node);
    paint();
    return f.node;
  }),

  'mapreduce-index': () => {
    const w = 420;
    const h = 250;
    const s = still(w, h);
    const parts: SVGElement[] = [];
    const docs = [
      { id: 'd1', text: 'rain in seattle', out: ['rain d1', 'in d1', 'seattle d1'] },
      { id: 'd2', text: 'seattle coffee', out: ['seattle d2', 'coffee d2'] },
      { id: 'd3', text: 'coffee in the rain', out: ['coffee d3', 'in d3', 'the d3', 'rain d3'] },
    ];
    const reducers = [
      { name: 'Reduce task 1', words: ['coffee  d2 d3', 'in  d1 d3'] },
      { name: 'Reduce task 2', words: ['rain  d1 d3', 'seattle  d1 d2', 'the  d3'] },
    ];
    parts.push(
      label(60, 14, 'Input', { bold: true, anchor: 'middle' }),
      label(190, 14, 'Map', { bold: true, anchor: 'middle' }),
      label(338, 14, 'Reduce', { bold: true, anchor: 'middle' }),
    );
    docs.forEach((d, i) => {
      const y = 28 + i * 70;
      parts.push(svg('rect', { x: 6, y, width: 108, height: 40, rx: 3, fill: tint(COL.data, 0.12), stroke: COL.data }));
      parts.push(small(12, y + 14, d.id, { bold: true }), small(12, y + 29, `"${d.text}"`));
      parts.push(line(116, y + 20, 132, y + 20, COL.soft, 1.2));
      parts.push(svg('rect', { x: 134, y: y - 4, width: 112, height: 12 + d.out.length * 11, rx: 3, fill: COL.paper, stroke: COL.request }));
      d.out.forEach((o, k) => parts.push(small(140, y + 7 + k * 11, o, { fill: COL.request })));
    });
    // Shuffle lines: each pair goes to the reduce task its word hashes to.
    const target = (word: string) => (['coffee', 'in'].includes(word) ? 0 : 1);
    docs.forEach((d, i) => {
      d.out.forEach((o, k) => {
        const y = 28 + i * 70 + 4 + k * 11;
        const r = target(o.split(' ')[0]);
        const ty = 58 + r * 100 + 10;
        parts.push(line(246, y, 280, ty, COL.soft, 0.7, { opacity: 0.8 }));
      });
    });
    reducers.forEach((r, i) => {
      const y = 46 + i * 100;
      parts.push(svg('rect', { x: 280, y, width: 134, height: 22 + r.words.length * 12, rx: 3, fill: COL.paper, stroke: COL.write }));
      parts.push(small(286, y + 13, r.name, { bold: true, fill: COL.write }));
      r.words.forEach((x, k) => parts.push(small(286, y + 27 + k * 12, x)));
    });
    parts.push(
      small(190, 236, 'Map output: pairs on the worker’s own disk,', { anchor: 'middle', soft: true }),
      small(190, 247, 'one file for each reduce task', { anchor: 'middle', soft: true }),
      small(347, 236, 'Reduce output:', { anchor: 'middle', soft: true }),
      small(347, 247, 'posting lists in GFS', { anchor: 'middle', soft: true }),
      small(263, 30, 'shuffle', { anchor: 'middle', soft: true }),
    );
    redraw(s.svg, ...parts);
    return { node: s.node };
  },
};
