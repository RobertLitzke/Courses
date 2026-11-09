// Small pieces most model figures share: a pair of axes to draw lines and
// dots on, a row of chips to pick one of, on/off chips, and a step of a few
// equations (Runge-Kutta). The same file is in the Botany and Ecology courses; they
// belong in Didactics once someone moves them.

import { svg } from 'didactics/dom';
import { label, line, polyline, small, type P } from 'didactics/draw';

export interface AxesOptions {
  /** The plotting box in drawing units. */
  x: number; y: number; w: number; h: number;
  xmin: number; xmax: number; ymin: number; ymax: number;
  /** Plot y by ratio (ymin must be above zero). */
  ylog?: boolean;
  xlabel?: string;
  ylabel?: string;
  xticks?: readonly number[];
  yticks?: readonly number[];
  xfmt?: (v: number) => string;
  yfmt?: (v: number) => string;
  ink?: string;
  grid?: string;
}

export interface Axes {
  X: (v: number) => number;
  Y: (v: number) => number;
  /** The frame, ticks and labels, to draw first. */
  parts: SVGElement[];
  /** A line through data points, clipped to the box. */
  path: (pts: readonly (readonly [number, number])[], color: string, width?: number, extra?: Record<string, string | number>) => SVGElement;
  /** A dot for each point. */
  dots: (pts: readonly (readonly [number, number])[], color: string, r?: number) => SVGElement[];
  o: AxesOptions;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export function axes(o: AxesOptions): Axes {
  const ink = o.ink ?? '#1f2a28';
  const grid = o.grid ?? 'rgba(31, 42, 40, 0.14)';
  const X = (v: number) => o.x + ((v - o.xmin) / (o.xmax - o.xmin)) * o.w;
  const Y = o.ylog
    ? (v: number) => o.y + o.h - (Math.log(Math.max(v, o.ymin) / o.ymin) / Math.log(o.ymax / o.ymin)) * o.h
    : (v: number) => o.y + o.h - ((v - o.ymin) / (o.ymax - o.ymin)) * o.h;
  const xf = o.xfmt ?? ((v: number) => String(v));
  const yf = o.yfmt ?? ((v: number) => String(v));
  const parts: SVGElement[] = [];
  for (const t of o.yticks ?? []) {
    parts.push(line(o.x, Y(t), o.x + o.w, Y(t), grid, 1), small(o.x - 4, Y(t) + 3, yf(t), { anchor: 'end', soft: true }));
  }
  for (const t of o.xticks ?? []) {
    parts.push(line(X(t), o.y + o.h, X(t), o.y + o.h + 4, ink, 1), small(X(t), o.y + o.h + 14, xf(t), { anchor: 'middle', soft: true }));
  }
  parts.push(
    line(o.x, o.y + o.h, o.x + o.w, o.y + o.h, ink, 1.2),
    line(o.x, o.y, o.x, o.y + o.h, ink, 1.2),
  );
  if (o.xlabel) parts.push(small(o.x + o.w, o.y + o.h + 26, o.xlabel, { anchor: 'end' }));
  if (o.ylabel) parts.push(small(o.x, o.y - 6, o.ylabel));
  const at = (p: readonly [number, number]): P => [X(p[0]), clamp(Y(p[1]), o.y - 2, o.y + o.h)];
  return {
    X, Y, parts, o,
    path: (pts, color, width = 2, extra = {}) => polyline(pts.map(at), color, width, extra),
    dots: (pts, color, r = 2.8) => pts.filter((p) => p[1] >= o.ymin && p[1] <= o.ymax * 1.0001).map((p) => svg('circle', { cx: X(p[0]), cy: Y(p[1]), r, fill: color, stroke: '#fbf8ef', 'stroke-width': 0.8 })),
  };
}

/** A key: a short line or dot and its words, in a row from (x, y). */
export function legend(x: number, y: number, items: readonly { text: string; color: string; dot?: boolean; dash?: boolean }[], gap = 12): SVGElement[] {
  const out: SVGElement[] = [];
  let at = x;
  for (const it of items) {
    out.push(it.dot
      ? svg('circle', { cx: at + 5, cy: y - 3, r: 3, fill: it.color })
      : line(at, y - 3, at + 12, y - 3, it.color, 2.5, it.dash ? { 'stroke-dasharray': '3 2' } : {}));
    const t = small(at + 16, y, it.text);
    out.push(t);
    at += 22 + it.text.length * 4.6 + gap;
  }
  return out;
}

/** A row of chips of which exactly one is on, as a radio group. */
export function pick(names: readonly string[], at: number, onChange: (i: number) => void): { node: HTMLElement; buttons: HTMLButtonElement[]; set: (i: number) => void; value: () => number } {
  let now = at;
  const node = document.createElement('div');
  node.className = 'chips';
  node.setAttribute('role', 'radiogroup');
  const buttons = names.map((n, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip';
    b.textContent = n;
    b.setAttribute('role', 'radio');
    b.addEventListener('click', () => set(i));
    node.append(b);
    return b;
  });
  const show = () => buttons.forEach((b, i) => {
    b.classList.toggle('on', i === now);
    b.setAttribute('aria-checked', String(i === now));
  });
  const set = (i: number) => {
    now = i;
    show();
    onChange(i);
  };
  show();
  return { node, buttons, set, value: () => now };
}

/** A row of on/off chips; `onChange` gets which are on. */
export function toggles(names: readonly string[], on: readonly boolean[], onChange: (on: boolean[]) => void): { node: HTMLElement; buttons: HTMLButtonElement[]; set: (i: number, v: boolean) => void; state: () => boolean[] } {
  const state = names.map((_, i) => !!on[i]);
  const node = document.createElement('div');
  node.className = 'chips';
  const show = (i: number) => {
    buttons[i].setAttribute('aria-pressed', String(state[i]));
    buttons[i].classList.toggle('on', state[i]);
  };
  const buttons = names.map((n, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip';
    b.textContent = n;
    b.addEventListener('click', () => {
      state[i] = !state[i];
      show(i);
      onChange(state.slice());
    });
    node.append(b);
    return b;
  });
  names.forEach((_, i) => show(i));
  return { node, buttons, set: (i, v) => { state[i] = v; show(i); }, state: () => state.slice() };
}

/** A plain button with words on it. */
export function button(text: string, onClick: () => void, ghost = true): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = ghost ? 'btn btn-ghost btn-small' : 'btn btn-small';
  b.textContent = text;
  b.addEventListener('click', onClick);
  return b;
}

/** One step of `dt` of dy/dt = f(y), fourth-order Runge-Kutta. */
export function rk4(f: (y: number[]) => number[], y: number[], dt: number): number[] {
  const add = (a: number[], b: number[], k: number) => a.map((v, i) => v + b[i] * k);
  const k1 = f(y);
  const k2 = f(add(y, k1, dt / 2));
  const k3 = f(add(y, k2, dt / 2));
  const k4 = f(add(y, k3, dt));
  return y.map((v, i) => v + (dt / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]));
}

/** The run of dy/dt = f(y) from y0, `steps` steps of `dt`, each state kept (y0 first). */
export function run(f: (y: number[]) => number[], y0: number[], dt: number, steps: number): number[][] {
  const out = [y0];
  let y = y0;
  for (let i = 0; i < steps; i++) {
    y = rk4(f, y, dt).map((v) => Math.max(0, v));
    out.push(y);
  }
  return out;
}

/** Words in a drawing, wrapped to lines of about `chars` characters, from (x, y) down. */
export function wrapped(x: number, y: number, text: string, chars: number, style: Parameters<typeof label>[3] = {}, lineHeight = 12): SVGElement[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > chars && cur) {
      lines.push(cur);
      cur = w;
    } else cur = (cur + ' ' + w).trim();
  }
  if (cur) lines.push(cur);
  return lines.map((l, i) => label(x, y + i * lineHeight, l, { size: 'small', ...style }));
}
