// Lesson 1, How does a bat fly in the dark? A room hung with wires, where the
// reader covers a bat's eyes, plugs its ears or ties its mouth shut and counts
// the wires it touches; and a still of a call going out and its echo coming
// back. The clue board and the put-in-order timeline are live charts from the
// lesson's JSON.

import { svg } from 'didactics/dom';
import { label, line, redraw, small, still } from 'didactics/draw';
import { makeRng } from 'didactics/rng';
import { COL, animate, figure, frame, tint, toggles, type FigureFactory } from './kit';

const W = 400;

/** What has been done to the bat: eyes covered, ears plugged, mouth tied shut. */
export interface Senses {
  eyes: boolean;
  ears: boolean;
  mouth: boolean;
}

/** The rows of wires a bat crosses on one flight down the room. */
export const ROWS = 3;

/**
 * The chance of touching a wire at each row: a bat that can hear the echoes
 * of its own calls steers through the gaps; one that can't flies nearly
 * blind, since the room is dark and covering the eyes changes nothing. A
 * model, with round numbers, not Griffin and Galambos's scores.
 */
export const hitChance = (s: Senses): number => (s.ears || s.mouth ? 0.4 : 0.04);

/** Whether the bat can echolocate: it needs to call and to hear. */
export const echoes = (s: Senses): boolean => !s.ears && !s.mouth;

export interface Flight {
  /** Where the bat enters the room, 0 (top) to 1 (bottom). */
  start: number;
  /** For each row of wires, whether the bat touches one. */
  hits: boolean[];
}

/** `n` flights down the room, the same each time for the same senses. */
export function flights(s: Senses, n = 20): Flight[] {
  const rng = makeRng(7 + (s.eyes ? 1 : 0) + (s.ears ? 2 : 0) + (s.mouth ? 4 : 0));
  const p = hitChance(s);
  return Array.from({ length: n }, () => ({ start: 0.15 + 0.7 * rng(), hits: Array.from({ length: ROWS }, () => rng() < p) }));
}

/** How many wires the bat touches in `n` flights. */
export const touches = (s: Senses, n = 20): number => flights(s, n).reduce((a, f) => a + f.hits.filter(Boolean).length, 0);

const NAMES = ['Eyes covered', 'Ears plugged', 'Mouth tied shut'] as const;

export const wireRoomFigure = figure(['senses'], (ctx, t) => {
  const f = frame(W, 250, 4);
  const room = { x: 10, y: 10, w: 380, h: 160 };
  const cols = [150, 215, 280];
  const gap = 32;
  // Wires in each row, staggered, as seen from above.
  const wires = cols.map((x, c) => {
    const ys: number[] = [];
    for (let y = room.y + 14 + (c % 2) * (gap / 2); y < room.y + room.h - 6; y += gap) ys.push(y);
    return { x, ys };
  });
  const back = svg('g');
  const fly = svg('g');
  const table = svg('g');
  f.svg.append(back, fly, table);
  back.append(
    svg('rect', { x: room.x, y: room.y, width: room.w, height: room.h, rx: 4, fill: tint(COL.bat, 0.08), stroke: COL.grid }),
    ...wires.flatMap((w) => w.ys.map((y) => svg('circle', { cx: w.x, cy: y, r: 2.4, fill: COL.ink }))),
    small(room.x + 6, room.y + room.h - 6, 'A dark room hung with wires, seen from above', { soft: true }),
  );

  let senses: Senses = { eyes: false, ears: false, mouth: false };
  let run = flights(senses);
  let k = 0;
  let x = room.x + 8;
  let hitShown = new Set<number>();
  let seenTouches = 0;
  // What each sense, taken away on its own, did: touches in 20 flights.
  const alone: (number | null)[] = [null, null, null];

  /** The bat's height at x on flight `fl`: through the gaps, or straight on into a wire. */
  const yAt = (fl: Flight, at: number) => {
    const y0 = room.y + 10 + fl.start * (room.h - 20);
    let y = y0;
    for (let c = 0; c < cols.length; c++) {
      const w = wires[c];
      const near = w.ys.reduce((b, wy) => (Math.abs(wy - y) < Math.abs(b - y) ? wy : b), w.ys[0]);
      // A bat that hears steers to the middle of the nearest gap; one that touches flies at the wire.
      const aim = fl.hits[c] ? near : near + (y >= near ? gap / 2 : -gap / 2);
      const from = c === 0 ? room.x + 8 : cols[c - 1];
      const k2 = Math.max(0, Math.min(1, (at - from) / (w.x - from)));
      // A bat that hears weaves smoothly; one that cannot drifts in a straight line.
      if (at < w.x) return y + (aim - y) * (echoes(senses) ? k2 * k2 * (3 - 2 * k2) : k2);
      y = aim;
    }
    return y;
  };

  const paintTable = () => {
    const parts: SVGElement[] = [small(room.x, 188, 'Each sense taken away on its own, 20 flights each:', { bold: true })];
    NAMES.forEach((n, i) => {
      const x0 = room.x + i * 128;
      const v = alone[i];
      parts.push(
        small(x0, 206, n, { soft: v === null }),
        v === null
          ? small(x0, 222, 'not tried yet', { soft: true })
          : small(x0, 222, `${v} wire${v === 1 ? '' : 's'} touched`, { bold: true, fill: v > 6 ? COL.bad : COL.good }),
      );
    });
    redraw(table, ...parts);
  };

  const paintBat = () => {
    const fl = run[k];
    const y = yAt(fl, x);
    const parts: SVGElement[] = [];
    const calling = !senses.mouth;
    if (calling) {
      // Calls going out ahead (violet), and, if the bat can hear them, echoes from the wires ahead (teal).
      const phase = (x / 26) % 1;
      for (let j = 0; j < 2; j++) {
        const r = 10 + (phase + j) * 22;
        parts.push(svg('path', { d: `M${x + r * 0.7},${y - r * 0.7} A${r},${r} 0 0 1 ${x + r * 0.7},${y + r * 0.7}`, fill: 'none', stroke: COL.call, 'stroke-width': 1.4, opacity: 0.9 - 0.4 * (phase + j) }));
      }
      const next = cols.find((c) => c > x);
      if (next !== undefined && next - x < 50 && !senses.ears) parts.push(line(next - 4, y, x + 8, y, COL.echo, 1.2, { 'stroke-dasharray': '3 3' }));
    }
    cols.forEach((c, i) => {
      if (fl.hits[i] && x >= c - 3) {
        if (!hitShown.has(i)) {
          hitShown.add(i);
          seenTouches += 1;
        }
        const wy = wires[i].ys.reduce((b, wy) => (Math.abs(wy - yAt(fl, c)) < Math.abs(b - yAt(fl, c)) ? wy : b), wires[i].ys[0]);
        parts.push(svg('circle', { cx: c, cy: wy, r: 7, fill: 'none', stroke: COL.bad, 'stroke-width': 2 }));
      }
    });
    parts.push(
      svg('path', { d: `M${x - 9},${y - 2} Q${x - 4},${y - 9} ${x},${y - 2} Q${x + 4},${y - 9} ${x + 9},${y - 2} L${x + 4},${y + 3} L${x},${y + 1} L${x - 4},${y + 3} Z`, fill: COL.bat }),
      label(room.x + room.w - 6, room.y + 16, `flight ${k + 1} of 20`, { anchor: 'end', size: 'small', soft: true }),
      label(room.x + room.w - 6, room.y + 30, `${seenTouches} touched so far`, { anchor: 'end', size: 'small', bold: true, fill: seenTouches ? COL.bad : COL.ink }),
    );
    redraw(fly, ...parts);
  };

  const describe = () => {
    const n = touches(senses);
    const what = NAMES.filter((_, i) => [senses.eyes, senses.ears, senses.mouth][i]);
    const head = what.length ? `${what.join(', ')}: ` : 'Nothing done to the bat: ';
    if (echoes(senses)) {
      return `${head}${n} wires touched in 20 flights. ${senses.eyes ? 'With its eyes covered it flies just as well; in the dark they were no use anyway.' : 'It weaves between the wires and touches one only now and then.'}`;
    }
    return `${head}${n} wires touched in 20 flights. ${senses.mouth && !senses.ears ? 'Its ears are open, yet it flies almost as if blind.' : 'It flies on, but blunders into wire after wire.'}`;
  };

  /** What to do next: each sense on its own, until all three are in the table. */
  const next = (on: boolean[]) => {
    const n = on.filter(Boolean).length;
    if (n > 1) return 'Only one sense taken away at a time goes in the table.';
    const left = NAMES.filter((_, i) => alone[i] === null);
    if (!left.length) return '';
    return n ? `Tap it again to undo, then try ${left.map((w) => w.toLowerCase()).join(' or ')}.` : `Next: ${left.map((w) => w.toLowerCase()).join(' or ')}.`;
  };

  const set = (on: boolean[]) => {
    senses = { eyes: on[0], ears: on[1], mouth: on[2] };
    run = flights(senses);
    k = 0;
    x = room.x + 8;
    hitShown = new Set();
    seenTouches = 0;
    const only = on.filter(Boolean).length === 1 ? on.indexOf(true) : -1;
    if (only >= 0) alone[only] = touches(senses);
    paintTable();
    paintBat();
    f.readout.textContent = `${describe()} ${next(on)}`;
    if (alone.every((v) => v !== null)) t.done();
  };

  const tg = toggles(NAMES, [false, false, false], set);
  f.controls.append(tg.node);
  paintTable();
  paintBat();
  f.readout.textContent = `${describe()} Tap a button below to take away one sense.`;

  animate(f.node, ctx, (dt) => {
    x += 110 * dt;
    if (x > room.x + room.w - 10) {
      x = room.x + 8;
      k = (k + 1) % run.length;
      hitShown = new Set();
      if (k === 0) seenTouches = 0;
    }
    paintBat();
  });
  return f.node;
});

// ---- A call and its echo (still) ------------------------------------------------------------------

export const darkEchoStill = () => {
  const s = still(W, 170);
  const bx = 60;
  const by = 90;
  const wx = 300;
  const parts: SVGElement[] = [];
  // The call spreads out from the bat as rings of sound.
  for (let i = 1; i <= 6; i++) {
    const r = i * 34;
    parts.push(svg('path', { d: `M${bx + r * 0.8},${by - r * 0.6} A${r},${r} 0 0 1 ${bx + r * 0.8},${by + r * 0.6}`, fill: 'none', stroke: COL.call, 'stroke-width': 1.6, opacity: 1 - i * 0.12 }));
  }
  // A little of it comes back from the wire.
  for (let i = 1; i <= 3; i++) {
    const r = i * 30;
    parts.push(svg('path', { d: `M${wx - r * 0.8},${by - r * 0.5} A${r},${r} 0 0 0 ${wx - r * 0.8},${by + r * 0.5}`, fill: 'none', stroke: COL.echo, 'stroke-width': 1.6, 'stroke-dasharray': '4 3', opacity: 0.9 - i * 0.2 }));
  }
  parts.push(
    line(wx, 14, wx, 160, COL.ink, 1.5),
    small(wx + 6, 26, 'a wire', { bold: true }),
    small(wx + 6, 38, 'about 1 mm thick', { soft: true }),
    svg('path', { d: `M${bx - 18},${by - 3} Q${bx - 8},${by - 16} ${bx},${by - 3} Q${bx + 8},${by - 16} ${bx + 18},${by - 3} L${bx + 8},${by + 6} L${bx},${by + 2} L${bx - 8},${by + 6} Z`, fill: COL.bat }),
    label(bx + 110, 22, 'the call goes out', { fill: COL.call, bold: true, size: 'small' }),
    label(wx - 60, 150, 'a faint echo comes back', { fill: COL.echo, bold: true, size: 'small', anchor: 'middle' }),
    small(10, 164, 'Seen from above. Most of the call passes the wire by.', { soft: true }),
  );
  s.svg.append(...parts);
  return { node: s.node };
};

export const FIGS: Record<string, FigureFactory> = {
  'wire-room': wireRoomFigure,
  'dark-echo': darkEchoStill,
};
