// Lesson P5, Training and serving from the same facts: a still of the
// offline and online stores fed from one definition, and a timeline where a
// feature is computed some minutes after the time it describes, so a training
// join on the latest value, on event time or on availability time gives a model
// that scores differently offline and in service.

import { svg } from 'didactics/dom';
import { line, polyline, redraw, small, still, type P } from 'didactics/draw';
import { COL, figure, frame, named, pick, slider } from './kit';
import { drawBoard, type BoardBox, type BoardWire } from './limiter';

export type Join = 'latest' | 'event' | 'available';

/** A road segment's average speed over the last 15 minutes, as it was at minute m of an hour (km/h). */
export const speedAt = (m: number) => 48 + 14 * Math.sin(m / 9) - (m > 34 && m < 46 ? 20 * Math.sin(((m - 34) / 12) * Math.PI) : 0);

/** The value a join gives a training example made at minute t, with the pipeline `lag` minutes behind. */
export function joined(join: Join, t: number, lag: number): number {
  if (join === 'latest') return speedAt(60);
  if (join === 'event') return speedAt(t);
  return speedAt(Math.max(0, t - lag));
}

/** What serving sees at minute t: the newest value the pipeline has finished. */
export const served = (t: number, lag: number) => speedAt(Math.max(0, t - lag));

export interface Scores {
  /** Mean error of arrival-time predictions, in minutes: measured offline, and in service. */
  offline: number;
  serving: number;
}

/**
 * Round figures of our own. A model trained on what serving will see scores
 * the same offline and in service, a little worse as the lag grows. A model
 * trained on event-time values learns to trust fresh data it will never get. A
 * model trained on the day's latest value has seen the future: it looks best
 * offline and is worst in service.
 */
export function scores(join: Join, lag: number): Scores {
  const base = 5 + 0.05 * lag;
  if (join === 'available') return { offline: base, serving: base };
  if (join === 'event') return { offline: 5, serving: base + 0.06 * lag };
  return { offline: 3.2, serving: base + 1.5 };
}

const mins = (v: number) => `${v.toFixed(1)} min`;

export const FIGS = {
  'features-stores': () => {
    const W = 600;
    const H = 240;
    const s = still(W, H);
    const g = svg('g');
    const over = svg('g');
    s.svg.append(g, over);
    const boxes: BoardBox[] = [
      { id: 'def', x: 80, y: 120, label: 'Feature definition', sub: 'one, in the registry', color: 'model', w: 140 },
      { id: 'batch', x: 250, y: 50, label: 'Batch job', sub: 'over history', color: 'write', w: 110 },
      { id: 'stream', x: 250, y: 190, label: 'Streaming job', sub: 'over new events', color: 'write', w: 110 },
      { id: 'off', x: 420, y: 50, label: 'Offline store', sub: 'every value, with times', shape: 'store', color: 'data', w: 140, h: 40 },
      { id: 'on', x: 400, y: 190, label: 'Online store', sub: 'latest value per key', shape: 'store', color: 'cache', w: 140, h: 40 },
      { id: 'train', x: 545, y: 120, label: 'Training', sub: 'point-in-time join', color: 'model', w: 100 },
      { id: 'serve', x: 550, y: 190, label: 'Serving', sub: 'a few ms', shape: 'pill', color: 'request', w: 84 },
    ];
    const wires: BoardWire[] = [
      { from: 'def', to: 'batch', weight: 0.15, color: 'model' },
      { from: 'def', to: 'stream', weight: 0.15, color: 'model' },
      { from: 'batch', to: 'off', weight: 0.2, color: 'write' },
      { from: 'stream', to: 'on', weight: 0.2, color: 'write' },
      { from: 'batch', to: 'on', weight: 0.1, color: 'write', dashed: true },
      { from: 'stream', to: 'off', weight: 0.12, color: 'write', dashed: true },
      { from: 'off', to: 'train', weight: 0.2, color: 'data' },
      { from: 'on', to: 'serve', weight: 0.2, color: 'cache' },
    ];
    drawBoard(g, boxes, wires);
    redraw(over, small(10, 236, 'Dashed: the batch job also loads slow features online, and the stream logs every value offline. One definition feeds both.', { soft: true }));
    return { node: s.node };
  },

  'features-pit': figure(['matched'], (_ctx, t) => {
    const W = 600;
    const H = 220;
    const f = frame(W, H, 3);
    const g = svg('g');
    f.svg.append(g);
    f.readout.style.whiteSpace = 'pre-line';
    let join: Join = 'latest';
    let lag = 10;
    const T0 = 30; // the training example: a trip requested at 12:30
    const x0 = 50;
    const x1 = W - 20;
    const X = (m: number) => x0 + (m / 60) * (x1 - x0);
    const Y = (v: number) => 160 - ((v - 20) / 50) * 120;
    const paint = () => {
      const parts: SVGElement[] = [];
      for (const m of [0, 15, 30, 45, 60]) parts.push(line(X(m), 40, X(m), 162, COL.grid, 1), small(X(m), 176, m === 60 ? '13:00' : `12:${String(m).padStart(2, '0')}`, { anchor: 'middle', soft: true }));
      parts.push(small(x0 - 6, Y(60) + 3, '60', { anchor: 'end', soft: true }), small(x0 - 6, Y(30) + 3, '30', { anchor: 'end', soft: true }), small(x0, 30, 'segment speed, km/h (average of the last 15 minutes)', { soft: true }));
      const ev: P[] = [];
      const av: P[] = [];
      for (let m = 0; m <= 60; m += 0.5) {
        ev.push([X(m), Y(speedAt(m))]);
        av.push([X(m), Y(served(m, lag))]);
      }
      parts.push(polyline(ev, COL.clock, 2), polyline(av, COL.cache, 2, { 'stroke-dasharray': '5 3' }));
      parts.push(line(X(T0), 36, X(T0), 162, COL.request, 1.5), small(X(T0) + 4, 46, 'trip requested', { fill: COL.request, bold: true }));
      // What serving saw, and what the join gives training.
      const sv = served(T0, lag);
      const jv = joined(join, T0, lag);
      const jx = join === 'latest' ? 60 : join === 'event' ? T0 : Math.max(0, T0 - lag);
      parts.push(svg('circle', { cx: X(T0), cy: Y(sv), r: 6, fill: 'none', stroke: COL.cache, 'stroke-width': 2.5 }));
      parts.push(svg('circle', { cx: X(jx), cy: Y(jv), r: 4.5, fill: Math.abs(jv - sv) < 0.5 ? COL.good : COL.error }));
      if (join !== 'available') parts.push(line(X(jx), Y(jv), X(T0), Y(sv), COL.error, 1, { 'stroke-dasharray': '3 3' }));
      parts.push(svg('rect', { x: x0, y: 190, width: 12, height: 3, fill: COL.clock }), small(x0 + 16, 194, 'the value for each moment (event time)'));
      parts.push(svg('rect', { x: x0 + 250, y: 190, width: 12, height: 3, fill: COL.cache }), small(x0 + 266, 194, `what serving has, ${lag} min later (availability time)`));
      parts.push(svg('circle', { cx: x0 + 6, cy: 210, r: 4, fill: COL.error }), small(x0 + 16, 214, 'value training was given'));
      parts.push(svg('circle', { cx: x0 + 256, cy: 210, r: 5, fill: 'none', stroke: COL.cache, 'stroke-width': 2 }), small(x0 + 266, 214, 'value serving had at 12:30'));
      redraw(g, ...parts);
      const s = scores(join, lag);
      f.readout.textContent = [
        `Training was given ${jv.toFixed(0)} km/h for the 12:30 trip; serving had ${sv.toFixed(0)} km/h.`,
        `Arrival-time error measured offline: ${mins(s.offline)}. In service: ${mins(s.serving)}.`,
        join === 'latest' ? 'The day\'s latest value includes the future, so the offline score is too good to be true.' : join === 'event' ? 'The value about 12:30 did not exist until later, so the model trusts fresh data it never gets.' : 'Training sees exactly what serving saw, so the offline score predicts the real one.',
      ].join('\n');
      if (join === 'available' && lag >= 5) t.done();
    };
    const j = named(pick(['Latest value', 'As of event time', 'As of availability time'], 0, (i) => { join = (['latest', 'event', 'available'] as const)[i]; paint(); }), 'Training join:');
    const l = slider('Pipeline lag', { min: 0, max: 20, step: 1, value: lag, show: (v) => `${v} min`, onInput: (v) => { lag = v; paint(); }, color: 'clock' });
    f.controls.append(j.node, l.node);
    paint();
    return f.node;
  }),
};
