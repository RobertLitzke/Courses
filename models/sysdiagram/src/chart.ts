// A small live line chart for a system figure: a few series over time or
// against load, on one pair of axes, redrawn as the numbers come in. For
// latency against load, throughput, a queue's length, errors.

import { svg } from 'didactics/dom';
import { text } from './view';

export interface Series {
  label: string;
  color: string;
  /** Points, x then y. */
  points: [number, number][];
  dashed?: boolean;
}

export interface ChartOptions {
  x: number;
  y: number;
  w: number;
  h: number;
  /** The ranges drawn; a y beyond the top is clipped to it. */
  xMax: number;
  yMax: number;
  xMin?: number;
  yMin?: number;
  xLabel?: string;
  yLabel?: string;
  /** Ticks along each axis, in data units. */
  xTicks?: number[];
  yTicks?: number[];
  tick?: (v: number, axis: 'x' | 'y') => string;
  colors: { ink: string; soft: string; grid: string };
}

export interface LineChart {
  node: SVGGElement;
  draw: (series: readonly Series[], marks?: readonly { x: number; label?: string; color: string }[]) => void;
  /** Data to drawing units. */
  px: (v: number) => number;
  py: (v: number) => number;
}

export function lineChart(into: SVGElement, o: ChartOptions): LineChart {
  const xMin = o.xMin ?? 0;
  const yMin = o.yMin ?? 0;
  const px = (v: number) => o.x + ((v - xMin) / (o.xMax - xMin)) * o.w;
  const py = (v: number) => o.y + o.h - ((Math.min(Math.max(v, yMin), o.yMax) - yMin) / (o.yMax - yMin)) * o.h;
  const fmt = o.tick ?? ((v: number) => String(v));
  const node = svg('g', { class: 'line-chart' }) as SVGGElement;
  into.append(node);
  const axes = svg('g', {});
  for (const v of o.yTicks ?? []) {
    axes.append(svg('line', { x1: o.x, y1: py(v), x2: o.x + o.w, y2: py(v), stroke: o.colors.grid, 'stroke-width': 1 }));
    axes.append(text(o.x - 4, py(v) + 3, fmt(v, 'y'), { anchor: 'end', fill: o.colors.soft, size: 9.5 }));
  }
  for (const v of o.xTicks ?? []) axes.append(text(px(v), o.y + o.h + 12, fmt(v, 'x'), { anchor: 'middle', fill: o.colors.soft, size: 9.5 }));
  axes.append(svg('path', { d: `M${o.x},${o.y} V${o.y + o.h} H${o.x + o.w}`, fill: 'none', stroke: o.colors.ink, 'stroke-width': 1.2 }));
  if (o.xLabel) axes.append(text(o.x + o.w, o.y + o.h + 24, o.xLabel, { anchor: 'end', fill: o.colors.soft, size: 10 }));
  if (o.yLabel) axes.append(text(o.x, o.y - 6, o.yLabel, { fill: o.colors.soft, size: 10 }));
  const live = svg('g', {});
  node.append(axes, live);

  function draw(series: readonly Series[], marks: readonly { x: number; label?: string; color: string }[] = []) {
    while (live.firstChild) live.firstChild.remove();
    for (const m of marks) {
      live.append(svg('line', { x1: px(m.x), y1: o.y, x2: px(m.x), y2: o.y + o.h, stroke: m.color, 'stroke-width': 1.2, 'stroke-dasharray': '3 3' }));
      if (m.label) live.append(text(px(m.x) + 3, o.y + 10, m.label, { fill: m.color, size: 9.5 }));
    }
    for (const s of series) {
      const pts = s.points.filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y));
      if (!pts.length) continue;
      const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${px(x).toFixed(1)},${py(y).toFixed(1)}`).join(' ');
      live.append(svg('path', { d, fill: 'none', stroke: s.color, 'stroke-width': 2, ...(s.dashed ? { 'stroke-dasharray': '5 3' } : {}) }));
    }
  }
  return { node, draw, px, py };
}

/** Keeps the last `n` samples of a few numbers, for a chart over time. */
export class History {
  readonly rows: { t: number; v: Record<string, number> }[] = [];
  constructor(readonly n = 200) {}
  add(t: number, v: Record<string, number>) {
    this.rows.push({ t, v });
    if (this.rows.length > this.n) this.rows.shift();
  }
  series(name: string): [number, number][] {
    return this.rows.map((r) => [r.t, r.v[name]]);
  }
}
