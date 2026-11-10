// Drawing a running System (model.ts) in an SVG: each part a shape by its
// kind with its name, links as arrows, requests as dots moving along the
// links and answers as dots coming back, a bar for how busy each part is and
// dots for its queue. A failed part is greyed and crossed; a cut link is
// dashed. Tapping a part or a link can fail it and bring it back. The colours
// come from the course, so they keep their meaning there.

import { svg } from 'didactics/dom';
import type { FigureContext } from 'didactics/figure';
import { animate } from 'didactics/figure';
import type { Kind, Link, Part, System } from './model';

export interface DiagramColors {
  ink: string;
  soft: string;
  /** The page behind the drawing, used for the inside of shapes. */
  paper: string;
  /** A request on its way. */
  request: string;
  /** A good answer coming back. */
  answer: string;
  /** A failure: an error coming back, a failed part's cross, a full queue. */
  error: string;
  /** How busy a part is, and its queue. */
  busy: string;
  /** Fill for a part, by kind; default the paper. */
  fill?: Partial<Record<Kind, string>>;
}

/** A box drawn behind some parts: a datacentre, a region, a rack, a shard group. */
export interface Group {
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  color?: string;
}

export interface ViewOptions {
  colors: DiagramColors;
  /** A part's box size, drawing units. Default 74 by 34. */
  boxW?: number;
  boxH?: number;
  groups?: Group[];
  /** What a tap does: fail a part (and bring it back), cut a link (and mend it), both, or nothing (default). */
  tap?: 'parts' | 'links' | 'both' | 'none';
  /** Called after a tap changes something. */
  onTap?: (what: { part?: string; link?: [string, string]; up: boolean }) => void;
  /** Parts that can't be tapped (clients, say). */
  fixed?: readonly string[];
  /** A second line under a part's name, redrawn each frame (a count of keys, a version). */
  sub?: (p: Part) => string | undefined;
  /** Show each part's busy bar and queue. Default true. */
  load?: boolean;
  /** Most moving dots drawn at once; the rest are not drawn. Default 80. */
  maxDots?: number;
}

export interface SystemView {
  /** The group the diagram is drawn in. */
  node: SVGGElement;
  /** Redraw what changes: dots, bars, queues, failures. */
  draw: () => void;
  /** Where a part sits, for a course's own marks over the diagram. */
  at: (id: string) => { x: number; y: number };
}

/** The point where a line from a box's centre toward (tx, ty) leaves the box. */
export function boxEdge(cx: number, cy: number, w: number, h: number, tx: number, ty: number): [number, number] {
  const dx = tx - cx;
  const dy = ty - cy;
  if (dx === 0 && dy === 0) return [cx, cy];
  const sx = dx !== 0 ? w / 2 / Math.abs(dx) : Infinity;
  const sy = dy !== 0 ? h / 2 / Math.abs(dy) : Infinity;
  const s = Math.min(sx, sy);
  return [cx + dx * s, cy + dy * s];
}

/** A point a fraction `f` along a quadratic curve from a through control c to b. */
export function along(a: [number, number], c: [number, number], b: [number, number], f: number): [number, number] {
  const u = 1 - f;
  return [u * u * a[0] + 2 * u * f * c[0] + f * f * b[0], u * u * a[1] + 2 * u * f * c[1] + f * f * b[1]];
}

/** A link's ends and control point, between box edges, bent sideways by `bend`. */
export function linkPath(a: Part, b: Part, bend: number, w: number, h: number) {
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  const nx = -(b.y - a.y) / len;
  const ny = (b.x - a.x) / len;
  const c: [number, number] = [mx + nx * bend, my + ny * bend];
  const p0 = boxEdge(a.x, a.y, w + 6, h + 6, c[0], c[1]);
  const p1 = boxEdge(b.x, b.y, w + 6, h + 6, c[0], c[1]);
  return { a: p0, c, b: p1 };
}

const NS = 'http://www.w3.org/2000/svg';

function shape(kind: Kind, w: number, h: number, fill: string, stroke: string): SVGElement {
  const x = -w / 2;
  const y = -h / 2;
  const base = { fill, stroke, 'stroke-width': 1.5 };
  switch (kind) {
    case 'client':
    case 'user':
      return svg('rect', { x, y, width: w, height: h, rx: h / 2, ...base });
    case 'db':
    case 'replica':
    case 'shard':
    case 'store': {
      const e = 5;
      const d = `M${x},${y + e} a${w / 2},${e} 0 0 0 ${w},0 a${w / 2},${e} 0 0 0 ${-w},0 v${h - 2 * e} a${w / 2},${e} 0 0 0 ${w},0 v${-(h - 2 * e)}`;
      return svg('path', { d, ...base });
    }
    case 'queue': {
      const g = svg('g', {});
      g.append(svg('rect', { x, y, width: w, height: h, rx: 3, ...base }));
      for (let i = 1; i < 4; i++) g.append(svg('line', { x1: x + w - i * 9, y1: y + 3, x2: x + w - i * 9, y2: y + h - 3, stroke, 'stroke-width': 1, opacity: 0.5 }));
      return g;
    }
    case 'lb':
    case 'dns': {
      const k = 9;
      return svg('path', { d: `M${x + k},${y} H${x + w - k} L${x + w},${y + h / 2} L${x + w - k},${y + h} H${x + k} L${x},${y + h / 2} Z`, ...base });
    }
    case 'cache':
      return svg('rect', { x, y, width: w, height: h, rx: 3, ...base, 'stroke-dasharray': '5 2' });
    case 'cdn':
    case 'region':
      return svg('rect', { x, y, width: w, height: h, rx: 12, ...base });
    case 'master':
      return svg('rect', { x, y, width: w, height: h, rx: 3, ...base, 'stroke-width': 2.5 });
    default:
      return svg('rect', { x, y, width: w, height: h, rx: 3, ...base });
  }
}

/**
 * Draws `sys` into `into` (an SVG, or a group in one). Call `draw()` after
 * each step of the model; `animateSystem` does both.
 */
export function systemView(sys: System, into: SVGElement, o: ViewOptions): SystemView {
  const W = o.boxW ?? 74;
  const H = o.boxH ?? 34;
  const C = o.colors;
  const tap = o.tap ?? 'none';
  const showLoad = o.load ?? true;
  const maxDots = o.maxDots ?? 80;
  const root = svg('g', { class: 'sysdiagram' }) as SVGGElement;
  into.append(root);

  for (const g of o.groups ?? []) {
    root.append(
      svg('rect', { x: g.x, y: g.y, width: g.w, height: g.h, rx: 8, fill: 'none', stroke: g.color ?? C.soft, 'stroke-width': 1.2, 'stroke-dasharray': '6 4' }),
      text(g.x + 8, g.y + 13, g.label, { fill: g.color ?? C.soft, size: 11 }),
    );
  }

  // Links: one path each, under the parts.
  const linkLayer = svg('g', {});
  const linkEls = new Map<Link, SVGElement>();
  for (const l of sys.links) {
    const p = linkPath(sys.part(l.from), sys.part(l.to), l.bend, W, H);
    const d = `M${p.a[0]},${p.a[1]} Q${p.c[0]},${p.c[1]} ${p.b[0]},${p.b[1]}`;
    const path = svg('path', { d, fill: 'none', stroke: C.soft, 'stroke-width': 1.4 });
    const ang = Math.atan2(p.b[1] - p.c[1], p.b[0] - p.c[0]);
    const k = 7;
    const head = svg('path', {
      d: `M${p.b[0]},${p.b[1]} L${p.b[0] - k * Math.cos(ang - 0.4)},${p.b[1] - k * Math.sin(ang - 0.4)} L${p.b[0] - k * Math.cos(ang + 0.4)},${p.b[1] - k * Math.sin(ang + 0.4)} Z`,
      fill: C.soft,
    });
    const g = svg('g', {}, path, head);
    if (tap === 'links' || tap === 'both') {
      const hit = svg('path', { d, fill: 'none', stroke: 'transparent', 'stroke-width': 16, style: 'cursor:pointer' });
      hit.addEventListener('click', () => {
        sys.setLink(l.from, l.to, !l.up);
        o.onTap?.({ link: [l.from, l.to], up: l.up });
        draw();
      });
      g.append(hit);
    }
    linkEls.set(l, g);
    linkLayer.append(g);
  }
  root.append(linkLayer);

  const dotLayer = svg('g', {});

  // Parts.
  const partEls = new Map<string, { g: SVGGElement; bar: SVGElement; queue: SVGGElement; cross: SVGElement; sub: SVGElement }>();
  const partLayer = svg('g', {});
  for (const p of sys.parts.values()) {
    const g = svg('g', { transform: `translate(${p.x},${p.y})` }) as SVGGElement;
    g.append(shape(p.kind, W, H, C.fill?.[p.kind] ?? C.paper, C.ink));
    g.append(text(0, 4, p.label, { anchor: 'middle', fill: C.ink, size: 11.5 }));
    const sub = text(0, H / 2 + 12, '', { anchor: 'middle', fill: C.soft, size: 10 });
    const bar = svg('rect', { x: -W / 2 + 3, y: H / 2 - 4, width: 0, height: 3, fill: C.busy });
    const queue = svg('g', {}) as SVGGElement;
    const cross = svg('path', { d: `M${-W / 2},${-H / 2} L${W / 2},${H / 2} M${W / 2},${-H / 2} L${-W / 2},${H / 2}`, stroke: C.error, 'stroke-width': 2.5, display: 'none' });
    g.append(bar, queue, cross, sub);
    const fixed = o.fixed?.includes(p.id) || p.kind === 'client' || p.kind === 'user';
    if ((tap === 'parts' || tap === 'both') && !fixed) {
      g.setAttribute('style', 'cursor:pointer');
      g.setAttribute('role', 'button');
      g.setAttribute('aria-label', `${p.label}: tap to fail or restore`);
      g.addEventListener('click', () => {
        sys.setUp(p.id, !p.up);
        o.onTap?.({ part: p.id, up: p.up });
        draw();
      });
    }
    partEls.set(p.id, { g, bar, queue, cross, sub });
    partLayer.append(g);
  }
  root.append(dotLayer, partLayer);

  const paths = new Map<string, ReturnType<typeof linkPath>>();
  const pathOf = (from: string, to: string) => {
    const k = `${from}>${to}`;
    let p = paths.get(k);
    if (!p) {
      const l = sys.link(from, to);
      if (l) p = linkPath(sys.part(from), sys.part(to), l.bend, W, H);
      else {
        // An answer travels back along its request's link.
        const back = sys.link(to, from);
        const q = linkPath(sys.part(to), sys.part(from), back?.bend ?? 0, W, H);
        p = { a: q.b, c: q.c, b: q.a };
      }
      paths.set(k, p);
    }
    return p;
  };

  function draw() {
    for (const [l, g] of linkEls) {
      g.setAttribute('opacity', l.up ? '1' : '0.45');
      (g.firstChild as SVGElement).setAttribute('stroke-dasharray', l.up ? '' : '4 4');
    }
    for (const p of sys.parts.values()) {
      const e = partEls.get(p.id)!;
      e.g.setAttribute('opacity', p.up ? '1' : '0.5');
      e.cross.setAttribute('display', p.up ? 'none' : '');
      const s = o.sub?.(p);
      e.sub.textContent = s ?? '';
      if (showLoad && p.kind !== 'client' && p.kind !== 'user') {
        e.bar.setAttribute('width', String(Math.max(0, (W - 6) * Math.min(1, p.busy / p.servers))));
        const n = p.waiting.length;
        while (e.queue.firstChild) e.queue.firstChild.remove();
        if (Number.isFinite(p.queue)) {
          // A line with a limit: a meter against the limit, red when full (the next arrival is turned away).
          const full = n >= p.queue;
          const mw = W - 6;
          e.queue.append(
            svg('rect', { x: -W / 2 + 3, y: -H / 2 - 9, width: mw, height: 4, rx: 2, fill: 'none', stroke: C.soft, 'stroke-width': 0.8 }),
            svg('rect', { x: -W / 2 + 3, y: -H / 2 - 9, width: mw * Math.min(1, n / p.queue), height: 4, rx: 2, fill: full ? C.error : C.busy }),
          );
          // The count only once the line is half full, so a row of lightly loaded boxes stays quiet.
          if (n * 2 >= p.queue) e.queue.append(text(W / 2 - 3, -H / 2 - 12, full ? `full ${n}/${p.queue}` : `${n}/${p.queue}`, { anchor: 'end', fill: full ? C.error : C.soft, size: 9, bold: full }));
        } else {
          const shown = Math.min(n, 8);
          for (let i = 0; i < shown; i++) e.queue.append(svg('circle', { cx: -W / 2 + 5 + i * 7, cy: -H / 2 - 6, r: 2.6, fill: C.busy }));
          if (n > shown) e.queue.append(text(-W / 2 + 5 + shown * 7, -H / 2 - 3, `+${n - shown}`, { fill: C.busy, size: 9 }));
        }
      }
    }
    while (dotLayer.firstChild) dotLayer.firstChild.remove();
    const wires = sys.wires;
    const step = Math.max(1, Math.ceil(wires.length / maxDots));
    for (let i = 0; i < wires.length; i += step) {
      const w = wires[i];
      const f = Math.min(1, Math.max(0, (sys.now - w.sent) / Math.max(1e-9, w.arrive - w.sent)));
      const p = pathOf(w.from, w.to);
      const [x, y] = along(p.a, p.c, p.b, f);
      const fill = w.what === 'request' ? C.request : w.what === 'answer' ? C.answer : C.error;
      dotLayer.append(svg('circle', { cx: x, cy: y, r: 3.4, fill, stroke: C.paper, 'stroke-width': 0.8 }));
    }
  }

  draw();
  return { node: root, draw, at: (id) => ({ x: sys.part(id).x, y: sys.part(id).y }) };
}

/** Text in the diagram's own small sizes. */
export function text(x: number, y: number, s: string, o: { anchor?: 'start' | 'middle' | 'end'; fill: string; size?: number; bold?: boolean }): SVGElement {
  const t = document.createElementNS(NS, 'text');
  t.setAttribute('x', String(x));
  t.setAttribute('y', String(y));
  t.setAttribute('fill', o.fill);
  t.setAttribute('font-size', String(o.size ?? 11));
  if (o.anchor) t.setAttribute('text-anchor', o.anchor);
  if (o.bold) t.setAttribute('font-weight', '600');
  t.textContent = s;
  return t;
}

export interface LiveOptions {
  /** Milliseconds of the system's clock per second on screen: 1000 is real time; 100 is slow motion, so dots can be followed. */
  speed: number;
  /** Called each frame after the model steps and the view redraws (to update a readout). */
  onFrame?: () => void;
  /** Paused while this returns true. */
  paused?: () => boolean;
}

/** Runs `sys` while the figure is on screen and redraws `view` each frame. */
export function animateSystem(node: Element, ctx: FigureContext, sys: System, view: SystemView, o: LiveOptions): void {
  animate(node, ctx, (dt) => {
    if (o.paused?.()) return;
    sys.run(dt * o.speed);
    view.draw();
    o.onFrame?.();
  });
}

