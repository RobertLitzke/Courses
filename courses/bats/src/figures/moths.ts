// Lesson 6, The moth that hears the bat: Roeder's two ear cells firing as a
// bat comes closer (guess first), and a game in which the reader is the moth.
// The sort of defences is a live chart from the lesson's JSON (groups).

import { svg } from 'didactics/dom';
import { label, line, redraw, small } from 'didactics/draw';
import { animate, button, COL, figure, frame, guessFirst, slider, tint, toggles, type FigureFactory } from './kit';
import { batShape, interval, mothShape } from './buzz';

const W = 400;

/** A hunting bat's call, dB at 10 cm (loud aerial hawkers reach 110 to 130). */
export const CALL_DB = 120;
/** What the air takes out of a 30 to 40 kHz call, dB a metre. */
export const ABSORB = 0.7;
/** How loud a bat's call is at the moth, `d` metres away, dB: spreading plus absorption. */
export const level = (d: number, source = CALL_DB) => source - 20 * Math.log10(d / 0.1) - ABSORB * d;
/** Where each cell first fires to a loud bat, metres (the model is set to these). */
export const A1_RANGE = 35;
export const A2_RANGE = 7;
export const A1_THRESHOLD = level(A1_RANGE);
export const A2_THRESHOLD = level(A2_RANGE);

/** Spikes a cell gives to one call: none below threshold, more the louder it is, up to `max`. */
export const spikes = (db: number, threshold: number, max: number) => (db < threshold ? 0 : Math.min(max, 1 + Math.floor((db - threshold) / 3)));

/** What a moth does on what its two cells report. */
export const response = (d: number): 'nothing' | 'turn' | 'dive' => (d <= A2_RANGE ? 'dive' : d <= A1_RANGE ? 'turn' : 'nothing');

export const cellsFigure = figure(['both'], (_ctx, t) => {
  const f = frame(W, 236, 4);
  const g = svg('g');
  f.svg.append(g);
  let d = 50;
  let sawTurn = false;
  let sawDive = false;
  const WINDOW = 0.3; // seconds of nerve recording shown
  const ROW = { call: 30, a1: 62, a2: 92 };
  const TX = (s: number) => 60 + (s / WINDOW) * 330;
  const paint = () => {
    const db = level(d);
    const every = interval(d);
    const calls: number[] = [];
    for (let s = 0.01; s < WINDOW; s += every) calls.push(s);
    const ticks: SVGElement[] = [];
    calls.forEach((c, k) => {
      ticks.push(svg('rect', { x: TX(c), y: ROW.call - 8, width: Math.max(1.5, TX(c + 0.006) - TX(c)), height: 10, fill: COL.call }));
      const n1 = spikes(db, A1_THRESHOLD, 8);
      const n2 = spikes(db, A2_THRESHOLD, 5);
      // Louder sound: sooner and closer-packed spikes.
      const gap1 = Math.max(0.0015, 0.005 - (db - A1_THRESHOLD) * 0.0001);
      for (let i = 0; i < n1; i++) {
        const s = c + 0.003 + i * gap1 + ((k * 7 + i * 3) % 5) * 0.0002;
        if (s < WINDOW) ticks.push(line(TX(s), ROW.a1 - 9, TX(s), ROW.a1 + 3, COL.moth, 1.4));
      }
      for (let i = 0; i < n2; i++) {
        const s = c + 0.004 + i * 0.003 + ((k * 5 + i) % 3) * 0.0003;
        if (s < WINDOW) ticks.push(line(TX(s), ROW.a2 - 9, TX(s), ROW.a2 + 3, COL.moth, 1.4));
      }
    });
    const what = response(d);
    // The moth's path, seen from the side: on, away, or down in loops.
    const path = what === 'nothing'
      ? 'M250,170 L380,170'
      : what === 'turn'
        ? 'M250,170 Q300,170 330,150 T390,128'
        : 'M250,170 Q270,166 280,180 Q288,196 300,184 Q312,170 318,196 Q324,214 340,206 Q352,200 350,222';
    const bx = 240 - Math.min(200, (Math.log10(d) / Math.log10(50)) * 200);
    redraw(g,
      small(8, ROW.call + 1, 'bat calls', { fill: COL.call }),
      small(8, ROW.a1 + 1, 'cell A1', { fill: COL.moth, bold: true }),
      small(8, ROW.a2 + 1, 'cell A2', { fill: COL.moth, bold: true }),
      line(60, ROW.a1 + 4, 390, ROW.a1 + 4, COL.grid, 1),
      line(60, ROW.a2 + 4, 390, ROW.a2 + 4, COL.grid, 1),
      ...ticks,
      small(390, 112, `${Math.round(WINDOW * 1000)} ms of recording`, { anchor: 'end', soft: true }),
      line(10, 196, 240, 196, COL.grid, 1),
      ...[1, 5, 10, 50].map((m) => small(240 - (Math.log10(m) / Math.log10(50)) * 200, 210, `${m} m`, { anchor: 'middle', soft: true })),
      batShape(Math.max(24, bx), 176),
      svg('path', { d: path, fill: 'none', stroke: COL.moth, 'stroke-width': 1.5, 'stroke-dasharray': '4 3' }),
      mothShape(250, 170),
      label(392, 150, open() ? { nothing: 'flies on', turn: 'turns away', dive: 'dives and loops' }[what] : '', { anchor: 'end', bold: true }),
      small(392, 230, `call at the moth: ${Math.round(db)} dB`, { anchor: 'end', soft: true }),
    );
    if (!open()) return;
    if (what === 'turn') sawTurn = true;
    if (what === 'dive') sawDive = true;
    f.readout.textContent = what === 'nothing'
      ? `At ${d} m the call has spread and faded below what even A1 can hear. The moth flies on, unaware; the bat cannot detect it either.${sawTurn ? '' : ' Drag the slider to bring the bat closer.'}`
      : what === 'turn'
        ? `At ${d} m A1 fires a few spikes per call and A2 is silent. The moth turns away from the side whose ear fires more, while the bat is still too far off to have found it.${sawDive ? '' : ' Bring the bat closer still.'}`
        : `At ${d} m A1 fires all it can and A2 has joined in. The bat may already have found the moth, and turning cannot outrun it; the moth folds its wings and drops in loops.`;
    if (sawTurn && sawDive) t.done();
  };
  const s = slider('Bat distance', 1, 50, 0.5, d, (v) => `${v} m`, (v) => { d = v; paint(); }, 'bat');
  f.controls.append(s.node);
  const open = guessFirst(t, f, {
    ask: 'A moth\'s ear has two cells: A1 answers to faint sounds, A2 only to loud ones. A bat 20 m away sets off A1 alone. What should the moth do?',
    options: ['Turn away from the sound', 'Dive and loop at once', 'Fly on and ignore it'],
    answer: 0,
    sliders: [s],
    after: () => paint(),
  });
  paint();
  return f.node;
});

// ---- The moth game ------------------------------------------------------------------

export interface Bat {
  name: string;
  /** Where the moth first hears it, metres. */
  heard: number;
  /** Where A2 joins in. */
  loud: number;
  /** Where it finds the moth. */
  finds: number;
  about: string;
}

/** The bats that come for the moth, round by round, in order. */
export const BATS: readonly Bat[] = [
  { name: 'A big brown bat', heard: A1_RANGE, loud: A2_RANGE, finds: 7, about: 'loud, from far off' },
  { name: 'A bat that swings your way', heard: 9, loud: A2_RANGE, finds: 7, about: 'it was calling the other way until now' },
  { name: 'A barbastelle', heard: 4, loud: 1.5, finds: 5, about: 'it whispers' },
  { name: 'A hoary bat', heard: A1_RANGE, loud: A2_RANGE, finds: 8, about: 'big and loud' },
];

export type Move = 'turn' | 'dive' | 'click';

/** What happens when the moth makes `move` with bat `b` at `d` metres. 'none' means nothing changed. */
export function outcome(move: Move, d: number, b: Bat, tiger: boolean): { result: 'escaped' | 'caught' | 'none'; why: string } {
  const found = d <= b.finds;
  if (move === 'turn') return found
    ? { result: 'caught', why: 'Too late to turn. The bat had already found you, and it flies faster than you.' }
    : { result: 'escaped', why: 'It never found you. You turned away while you were still beyond the reach of its sonar.' };
  if (move === 'dive') {
    if (d < 1) return { result: 'caught', why: 'Too late: the bat was in its buzz, under a metre away, when you folded your wings.' };
    return found
      ? { result: 'escaped', why: 'Your dive and loops took you out of its path. A bat cannot follow a moth dropping like that.' }
      : { result: 'escaped', why: 'Safe, at a price: the bat had not found you yet, and you dropped out of the air for nothing.' };
  }
  if (!tiger) return { result: 'none', why: 'An ordinary moth has no way to click.' };
  return found
    ? { result: 'escaped', why: 'Your clicks landed in its buzz and jammed it. It missed you by a few centimetres.' }
    : { result: 'none', why: 'Too early: clicks jam only a bat that is closing in. Keep listening.' };
}

export const gameFigure = figure(['escape'], (ctx, t) => {
  const f = frame(W, 214, 3);
  const g = svg('g');
  f.svg.append(g);
  let round = 0;
  let d = BATS[0].heard;
  let state: 'waiting' | 'flying' | 'escaped' | 'caught' = 'waiting';
  let tiger = false;
  let note = '';
  const results: boolean[] = [];
  const SLOW = 0.5; // game time runs at half speed
  const SPEED = 5;
  const PX = 8;
  const bat = () => BATS[round % BATS.length];
  const paint = () => {
    const b = bat();
    const x = 360 - Math.min(d, 40) * PX;
    const a1 = d <= b.heard && state === 'flying';
    const a2 = d <= b.loud && state === 'flying';
    const lamp = (cx: number, on: boolean, words: string) => [
      svg('circle', { cx, cy: 30, r: 8, fill: on ? COL.moth : '#fff', stroke: COL.moth, 'stroke-width': 1.5 }),
      small(cx + 12, 34, words, { fill: COL.moth, bold: on }),
    ];
    redraw(g,
      ...lamp(20, a1, 'A1'),
      ...lamp(70, a2, 'A2'),
      label(392, 34, `${b.name}`, { anchor: 'end', bold: true }),
      small(392, 48, b.about, { anchor: 'end', soft: true }),
      line(40, 120, 390, 120, COL.grid, 1),
      ...[0, 10, 20, 30, 40].map((m) => small(360 - m * PX, 134, `${m} m`, { anchor: 'middle', soft: true })),
      svg('rect', { x: 360 - b.finds * PX, y: 66, width: b.finds * PX, height: 54, fill: tint(COL.call, 0.08) }),
      small(360 - b.finds * PX + 3, 78, 'it can find you', { fill: COL.call }),
      batShape(Math.max(30, x), 98, 1.2),
      ...(state === 'flying' && d <= b.finds ? [svg('path', { d: `M${x + 18},92 Q${x + 26},98 ${x + 18},104`, fill: 'none', stroke: COL.call, 'stroke-width': 1.5 })] : []),
      mothShape(366, state === 'escaped' ? 112 : 98, state === 'caught'),
      ...results.map((ok, i) => svg('circle', { cx: 20 + i * 16, cy: 196, r: 6, fill: ok ? COL.good : COL.bad })),
      small(20 + results.length * 16 + 4, 200, `${results.filter(Boolean).length} of 3 escapes needed${results.length ? `, in ${results.length} round${results.length === 1 ? '' : 's'}` : ''}`, { soft: true }),
    );
    f.readout.textContent = state === 'waiting'
      ? `You are the moth. ${b.name} is coming. Press Start: your A1 cell hears it at ${b.heard} m. Then tap Turn away or Dive in time.`
      : state === 'flying'
        ? note || (d > b.finds ? 'A1 is firing: a bat is out there, but it has not found you yet.' : 'It has found you and is closing in.')
        : `${note}${results.filter(Boolean).length >= 3 ? '' : ' Press Next bat.'}`;
    for (const m of [turnB, diveB, clickB]) m.disabled = state !== 'flying';
    next.disabled = state === 'flying';
  };
  const end = (escaped: boolean, why: string) => {
    state = escaped ? 'escaped' : 'caught';
    note = (escaped ? 'Escaped. ' : 'Caught. ') + why;
    results.push(escaped);
    if (results.filter(Boolean).length >= 3) t.done();
    next.textContent = 'Next bat';
    paint();
  };
  const act = (m: Move) => {
    if (state !== 'flying') return;
    const o = outcome(m, d, bat(), tiger);
    if (o.result === 'none') {
      note = o.why;
      paint();
    } else end(o.result === 'escaped', o.why);
  };
  const next = button('Start', () => {
    if (state === 'flying') return;
    if (state !== 'waiting') round++;
    d = bat().heard;
    note = '';
    state = 'flying';
    paint();
  }, false);
  const moves = document.createElement('div');
  moves.className = 'chips';
  const turnB = button('Turn away', () => act('turn'));
  const diveB = button('Dive', () => act('dive'));
  const clickB = button('Click', () => act('click'));
  clickB.style.display = 'none';
  moves.append(next, turnB, diveB, clickB);
  const tig = toggles(['Tiger moth: can click'], [false], (on) => {
    tiger = on[0];
    clickB.style.display = tiger ? '' : 'none';
  });
  f.controls.append(moves, tig.node);
  animate(f.svg, ctx, (dt) => {
    if (state !== 'flying') return;
    d -= SPEED * SLOW * dt;
    if (d <= 0.1) {
      d = 0.1;
      end(false, 'The bat scooped you up at the end of its buzz.');
      return;
    }
    paint();
  });
  paint();
  return f.node;
});

export const FIGS: Record<string, FigureFactory> = {
  'moths-cells': cellsFigure,
  'moths-game': gameFigure,
};

