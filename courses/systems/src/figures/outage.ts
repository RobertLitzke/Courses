// Lesson 23, One command, four hours: how far one bad request reaches in one
// shared fleet, in cells and in shuffle shards; a data plane that keeps
// working when its control plane is down; and the dependency loop that kept
// Facebook's engineers from their own tools in October 2021.

import { svg } from 'didactics/dom';
import { label, line, redraw, small } from 'didactics/draw';
import { liveDiagram, statsLine, type LinkSpec, type PartSpec } from './diagram';
import { COL, figure, frame, named, pick, tint } from './kit';

// ---------------------------------------------------------------------------
// Blast radius: one fleet, cells, shuffle shards.

export type Layout = 'fleet' | 'cells' | 'shuffle';

/** Servers in the drawing. */
export const SERVERS = 8;

/** n choose k. */
export function choose(n: number, k: number): number {
  let r = 1;
  for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i;
  return Math.round(r);
}

/** Every pair of the 8 servers, in order: one customer each, 28 customers. */
export const PAIRS: readonly (readonly [number, number])[] = (() => {
  const out: [number, number][] = [];
  for (let a = 0; a < SERVERS; a++) for (let b = a + 1; b < SERVERS; b++) out.push([a, b]);
  return out;
})();

/** The servers customer `c` (0 to 27) uses under each layout. */
export function serversOf(layout: Layout, c: number): number[] {
  if (layout === 'fleet') return [...Array(SERVERS).keys()];
  if (layout === 'cells') {
    const cell = Math.floor(c / 7);
    return [cell * 2, cell * 2 + 1];
  }
  return [...PAIRS[c]];
}

export interface Blast {
  dead: Set<number>;
  /** Customers with no server left, with some gone, and untouched. */
  down: number;
  degraded: number;
  fine: number;
}

/**
 * Customer `poison` sends a request that crashes any server it reaches, and
 * its client retries on its other servers until every one it can reach is
 * down. Which servers die, and how the other customers fare.
 */
export function blast(layout: Layout, poison: number): Blast {
  const dead = new Set(serversOf(layout, poison));
  let down = 0;
  let degraded = 0;
  let fine = 0;
  for (let c = 0; c < PAIRS.length; c++) {
    const mine = serversOf(layout, c);
    const lost = mine.filter((s) => dead.has(s)).length;
    if (lost === mine.length) down++;
    else if (lost) degraded++;
    else fine++;
  }
  return { dead, down, degraded, fine };
}

const shardsFigure = figure(['shuffle'], (_ctx, t) => {
  const W = 470;
  const H = 270;
  const f = frame(W, H, 3);
  const g = svg('g');
  f.svg.append(g);
  let layout: Layout = 'fleet';
  let poison = -1;
  const sx = (s: number) => 40 + s * 55.7;
  const SY = 34;
  const cx = (c: number) => 12 + (c % 7) * 64 + 29;
  const cy = (c: number) => 110 + Math.floor(c / 7) * 38;
  const nameOf = (c: number) => {
    if (layout === 'fleet') return 'all';
    if (layout === 'cells') return `cell ${'ABCD'[Math.floor(c / 7)]}`;
    return PAIRS[c].map((s) => s + 1).join(' · ');
  };
  const paint = () => {
    const b = poison >= 0 ? blast(layout, poison) : undefined;
    const parts: SVGElement[] = [small(8, 12, 'Servers', { soft: true }), small(8, 96, 'Customers (tap one to send a request that crashes its server)', { soft: true })];
    if (layout === 'cells') {
      for (let k = 0; k < 4; k++) parts.push(svg('rect', { x: sx(2 * k) - 24, y: SY - 20, width: 104, height: 42, rx: 6, fill: 'none', stroke: COL.soft, 'stroke-dasharray': '4 3' }), small(sx(2 * k) + 28, SY + 34, `cell ${'ABCD'[k]}`, { anchor: 'middle', soft: true }));
    }
    if (b && poison >= 0) {
      for (const s of serversOf(layout, poison)) parts.push(line(cx(poison), cy(poison) - 11, sx(s), SY + 13, COL.error, 1.2, { opacity: 0.6 }));
    }
    for (let s = 0; s < SERVERS; s++) {
      const dead = b?.dead.has(s);
      parts.push(svg('rect', { x: sx(s) - 18, y: SY - 13, width: 36, height: 26, rx: 3, fill: dead ? tint(COL.error, 0.15) : COL.paper, stroke: dead ? COL.error : COL.ink, 'stroke-width': 1.4 }));
      parts.push(label(sx(s), SY + 4, String(s + 1), { anchor: 'middle', fill: dead ? COL.error : COL.ink }));
      if (dead) parts.push(svg('path', { d: `M${sx(s) - 14},${SY - 10} L${sx(s) + 14},${SY + 10} M${sx(s) + 14},${SY - 10} L${sx(s) - 14},${SY + 10}`, stroke: COL.error, 'stroke-width': 2 }));
    }
    for (let c = 0; c < PAIRS.length; c++) {
      let col: string = COL.soft;
      if (b) {
        const mine = serversOf(layout, c);
        const lost = mine.filter((s) => b.dead.has(s)).length;
        col = lost === mine.length ? COL.error : lost ? COL.busy : COL.answer;
      }
      const chip = svg('g', { style: 'cursor:pointer', role: 'button', 'aria-label': `Customer ${c + 1}` });
      chip.append(
        svg('rect', { x: cx(c) - 29, y: cy(c) - 11, width: 58, height: 24, rx: 12, fill: tint(col, 0.14), stroke: col, 'stroke-width': c === poison ? 2.6 : 1.2 }),
        small(cx(c), cy(c) + 5, nameOf(c), { anchor: 'middle', fill: COL.ink }),
      );
      chip.addEventListener('click', () => { poison = c; paint(); check(); });
      parts.push(chip);
    }
    redraw(g, ...parts);
    const pct = (n: number) => `${Math.round((n / PAIRS.length) * 100)}%`;
    f.readout.textContent = !b
      ? layout === 'fleet' ? 'One fleet: every customer is spread over all eight servers. Tap a customer to send a request that crashes whatever server runs it.' : layout === 'cells' ? 'Four cells of two servers, seven customers in each. Tap a customer.' : 'Shuffle shards: each customer has its own pair of the eight servers, 28 pairs in all. Tap a customer.'
      : `${b.dead.size} of 8 servers crashed. ${b.down} of 28 customers (${pct(b.down)}) have no server left; ${b.degraded} (${pct(b.degraded)}) lost one of theirs and run on the other; ${b.fine} are untouched.`;
  };
  const check = () => { if (layout === 'shuffle' && poison >= 0) t.done(); };
  const layouts = named(pick(['One fleet', 'Cells', 'Shuffle shards'], 0, (i) => { layout = (['fleet', 'cells', 'shuffle'] as const)[i]; paint(); check(); }), 'Layout:');
  f.controls.append(layouts.node);
  paint();
  return f.node;
});

// ---------------------------------------------------------------------------
// Static stability: a data plane that asks the control plane on every request,
// or one that keeps working from the last configuration it was given.

const staticParts = (): PartSpec[] => [
  { id: 'users', kind: 'client', label: 'Users', x: 55, y: 105, rps: 30, timeoutMs: 400 },
  { id: 'lb', kind: 'lb', label: 'Balancer', x: 175, y: 105, health: true },
  { id: 'w1', kind: 'server', label: 'Server 1', x: 300, y: 55, serviceMs: 15, servers: 4 },
  { id: 'w2', kind: 'server', label: 'Server 2', x: 300, y: 155, serviceMs: 15, servers: 4 },
  { id: 'cp', kind: 'master', label: 'Control plane', x: 410, y: 105, serviceMs: 5, servers: 4 },
];

const staticLinks = (asks: boolean): LinkSpec[] => [
  { from: 'users', to: 'lb', ms: 30 },
  { from: 'lb', to: 'w1', ms: 20 },
  { from: 'lb', to: 'w2', ms: 20 },
  ...(asks
    ? [{ from: 'w1', to: 'cp', ms: 25 }, { from: 'w2', to: 'cp', ms: 25 }]
    : [{ from: 'cp', to: 'w1', ms: 25 }, { from: 'cp', to: 'w2', ms: 25 }]),
];

const staticFigure = figure(['static'], (ctx, t) => {
  let asks = true;
  let cpUp = true;
  const spec = () => ({ parts: staticParts().map((p) => (p.id === 'cp' ? { ...p, down: !cpUp } : p)), links: staticLinks(asks), seed: 3 });
  const d = liveDiagram(ctx, spec(), {
    w: 480, h: 210, tap: 'parts', lines: 3, speed: 120, boxW: 92, fixed: ['lb', 'w1', 'w2'],
    sub: (p) => (p.id === 'cp' ? (asks ? 'asked each time' : 'sends config') : undefined),
    onFrame: (sys) => {
      const s = sys.stats(2500);
      const head = !cpUp ? 'The control plane is down. ' : 'Tap the control plane to fail it. ';
      d.f.readout.textContent = head + statsLine(s);
    },
    onTap: ({ part, up }) => { if (part === 'cp') { cpUp = up; check(); } },
  });
  const check = () => { if (!asks && !cpUp) t.done(); };
  const design = named(pick(['Asks on every request', 'Uses its last config'], 0, (i) => { asks = i === 0; d.rebuild(spec()); check(); }), 'Servers:');
  d.f.controls.append(design.node);
  return d.f.node;
});

// ---------------------------------------------------------------------------
// The dependency loop of 4 October 2021.

interface Dep { id: string; name: string; x: number; y: number; needs: string[]; any?: boolean; note: string }

/** What needs what, as Facebook's account of 4 October 2021 describes it (simplified). */
export const DEPS: readonly Dep[] = [
  { id: 'backbone', name: 'Backbone network', x: 235, y: 32, needs: [], note: 'the links between datacentres' },
  { id: 'dc', name: 'Datacentres', x: 85, y: 108, needs: ['backbone'], note: 'reachable only over the backbone' },
  { id: 'dns', name: 'DNS servers', x: 235, y: 108, needs: ['backbone'], note: 'withdraw their routes when they lose the datacentres' },
  { id: 'remote', name: 'Remote access', x: 385, y: 108, needs: ['backbone'], note: 'engineers\' way in to the network\'s routers' },
  { id: 'apps', name: 'Apps for users', x: 85, y: 190, needs: ['dc', 'dns'], note: 'Facebook, Instagram, WhatsApp' },
  { id: 'tools', name: 'Internal tools', x: 235, y: 190, needs: ['dc', 'dns'], note: 'the tools used to investigate outages' },
  { id: 'fix', name: 'Repair from a desk', x: 385, y: 190, needs: ['remote', 'tools'], note: 'how a network change is normally undone' },
  { id: 'site', name: 'Repair on site', x: 385, y: 262, needs: [], note: 'slow: secure buildings, hardware hard to change' },
];

/** Everything that stops when the parts in `failed` stop: a part fails if any part it needs has failed. */
export function fallout(failed: readonly string[]): Set<string> {
  const down = new Set(failed);
  for (let changed = true; changed;) {
    changed = false;
    for (const d of DEPS) {
      if (down.has(d.id) || !d.needs.length) continue;
      if (d.needs.some((n) => down.has(n))) {
        down.add(d.id);
        changed = true;
      }
    }
  }
  return down;
}

const loopFigure = figure(['loop'], (_ctx, t) => {
  const W = 470;
  const H = 290;
  const f = frame(W, H, 3);
  const g = svg('g');
  f.svg.append(g);
  const failed = new Set<string>();
  const byId = new Map(DEPS.map((d) => [d.id, d]));
  const BW = 120;
  const BH = 30;
  /** Where a line from a box's centre toward (tx, ty) leaves the box. */
  const rim = (cx: number, cy: number, tx: number, ty: number): [number, number] => {
    const dx = tx - cx;
    const dy = ty - cy;
    const k = Math.min(dx ? (BW / 2 + 2) / Math.abs(dx) : Infinity, dy ? (BH / 2 + 2) / Math.abs(dy) : Infinity);
    return [cx + dx * k, cy + dy * k];
  };
  const paint = () => {
    const down = fallout([...failed]);
    const parts: SVGElement[] = [];
    for (const d of DEPS) {
      for (const n of d.needs) {
        const to = byId.get(n)!;
        const bad = down.has(n);
        const [x1, y1] = rim(d.x, d.y, to.x, to.y);
        const [x2, y2] = rim(to.x, to.y, d.x, d.y);
        parts.push(line(x1, y1, x2, y2, bad ? COL.error : COL.soft, bad ? 1.8 : 1.2));
        const a = Math.atan2(y2 - y1, x2 - x1);
        parts.push(svg('path', { d: `M${x2},${y2} L${x2 - 7 * Math.cos(a - 0.4)},${y2 - 7 * Math.sin(a - 0.4)} L${x2 - 7 * Math.cos(a + 0.4)},${y2 - 7 * Math.sin(a + 0.4)} Z`, fill: bad ? COL.error : COL.soft }));
      }
    }
    for (const d of DEPS) {
      const bad = down.has(d.id);
      const box = svg('g', { style: 'cursor:pointer', role: 'button', 'aria-label': `${d.name}: tap to fail or restore` });
      box.append(
        svg('rect', { x: d.x - BW / 2, y: d.y - BH / 2, width: BW, height: BH, rx: 4, fill: bad ? tint(COL.error, 0.14) : COL.paper, stroke: bad ? COL.error : COL.ink, 'stroke-width': failed.has(d.id) ? 2.6 : 1.3 }),
        label(d.x, d.y + 4, d.name, { anchor: 'middle', fill: bad ? COL.error : COL.ink }),
      );
      box.addEventListener('click', () => {
        if (failed.has(d.id)) failed.delete(d.id);
        else failed.add(d.id);
        paint();
        if (failed.has('backbone')) t.done();
      });
      parts.push(box);
    }
    parts.push(small(8, 262, 'An arrow points from a part to what it needs.', { soft: true }), small(8, 276, 'Tap a part to fail it.', { soft: true }));
    redraw(g, ...parts);
    if (!failed.size) f.readout.textContent = 'Everything is running. Tap the backbone network to cut it, as the command of 4 October 2021 did.';
    else {
      const names = DEPS.filter((d) => down.has(d.id)).map((d) => d.name.toLowerCase());
      const stuck = down.has('fix') ? ' The only way left to undo the change is to go to the buildings.' : '';
      f.readout.textContent = `Down: ${names.join(', ')}.${stuck}`;
    }
  };
  paint();
  return f.node;
});

export const FIGS = {
  'outage-shards': shardsFigure,
  'outage-static': staticFigure,
  'outage-loop': loopFigure,
};
