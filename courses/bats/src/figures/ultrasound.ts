// Lesson 3, Why so high? Waves passing a small insect or bouncing off it as
// the pitch changes; the trade-off between finding small prey and reaching
// far, as the air soaks up high sound (guess first); and the two shapes of
// call, sweeps and steady tones, on a sonogram with slowed sound.

import { svg } from 'didactics/dom';
import { label, line, redraw, small } from 'didactics/draw';
import { COL, animate, axes, figure, frame, guessFirst, named, pick, slider, tint, toggles, type FigureFactory } from './kit';
import { playButton, type Call } from './sound';

const W = 400;

/** The speed of sound in air at about 20 °C, metres a second. */
export const SPEED = 343;

/** Wavelength in millimetres of a sound of `khz` kilohertz. */
export const wavelength = (khz: number): number => SPEED / khz;

// How much air at 20 °C and middling humidity soaks up sound, in decibels a
// metre, by frequency in kilohertz (round values from ISO 9613-1).
const ABS: readonly (readonly [number, number])[] = [
  [10, 0.16], [20, 0.5], [30, 0.85], [40, 1.25], [50, 1.65], [60, 2.05], [80, 2.7], [100, 3.3], [120, 3.9], [150, 4.8],
];

/** Loss to the air, in decibels for each metre the sound travels. */
export function absorption(khz: number): number {
  if (khz <= ABS[0][0]) return ABS[0][1];
  for (let i = 1; i < ABS.length; i++) {
    const [f1, a1] = ABS[i];
    const [f0, a0] = ABS[i - 1];
    if (khz <= f1) return a0 + ((a1 - a0) * (khz - f0)) / (f1 - f0);
  }
  return ABS[ABS.length - 1][1];
}

export interface Target {
  name: string;
  /** Half its size in metres: the size that sets where its echo fades. */
  radius: number;
  /** How strongly it echoes when the waves are short beside it, in decibels (target strength at 1 m). */
  strength: number;
}

/** A midge 3 mm long, and a moth with wings 4 cm across. */
export const MIDGE: Target = { name: 'midge', radius: 0.001, strength: -66 };
export const MOTH: Target = { name: 'moth', radius: 0.02, strength: -30 };

/**
 * How strongly a target echoes at `khz`: its full strength once its size is
 * about the wavelength or more, falling with the fourth power of size over
 * wavelength below that (Rayleigh scattering).
 */
export function targetStrength(khz: number, tg: Target): number {
  const ka = ((2 * Math.PI * khz * 1000) / SPEED) * tg.radius;
  return tg.strength + (ka < 1 ? 40 * Math.log10(ka) : 0);
}

/** How loud a call is 10 cm from the bat's mouth, in decibels. */
export const CALL_DB = 130;

/** The faintest echo the bat picks out in this model, in decibels. */
export const THRESHOLD = 20;

/**
 * The echo's level at the bat, in decibels, from a target `r` metres away:
 * the call spreads out on the way there and the echo on the way back, and
 * the air takes its share both ways.
 */
export function echoLevel(khz: number, tg: Target, r: number): number {
  return CALL_DB - 20 * Math.log10(r / 0.1) - 20 * Math.log10(r) + targetStrength(khz, tg) - 2 * absorption(khz) * r;
}

export const heard = (khz: number, tg: Target, r: number): boolean => echoLevel(khz, tg, r) >= THRESHOLD;

/** The farthest a target can be and still be heard, in metres (0 if not even at 10 cm). */
export function reach(khz: number, tg: Target): number {
  let lo = 0.1;
  let hi = 60;
  if (!heard(khz, tg, lo)) return 0;
  if (heard(khz, tg, hi)) return hi;
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2;
    if (heard(khz, tg, mid)) lo = mid;
    else hi = mid;
  }
  return lo;
}

/** The share of a big target's echo that a target sends back at `khz`, from 0 to 1 (as power). */
export const echoShare = (khz: number, tg: Target): number => Math.min(1, Math.pow(((2 * Math.PI * khz * 1000) / SPEED) * tg.radius, 4));

// ---- Waves past a small insect ---------------------------------------------------------------------

export const wavesFigure = figure(['bounce'], (ctx, t) => {
  const f = frame(W, 200, 4);
  const g = svg('g');
  f.svg.append(g);
  let khz = 20;
  let target = MIDGE;
  let phase = 0;
  let sawWeak = false;
  let sawStrong = false;
  const px = 4; // drawing units a millimetre
  const tx = 240;
  const ty = 96;

  const paint = () => {
    const lam = wavelength(khz) * px;
    const share = echoShare(khz, target);
    const parts: SVGElement[] = [];
    // Incoming crests, moving right; they carry on past the insect.
    for (let x = 20 + (phase % 1) * lam; x < 392; x += lam) {
      parts.push(line(x, 16, x, 176, COL.call, 1.6, { opacity: x > tx ? 0.55 : 0.9 }));
    }
    // The echo: rings spreading back from the insect, as strong as its share.
    for (let k = 1; k * lam < 240; k++) {
      const r = (k - (phase % 1)) * lam;
      if (r <= 2) continue;
      const fade = Math.max(0, 1 - r / 230);
      parts.push(svg('path', { d: `M${tx - r * 0.5},${ty - r * 0.86} A${r},${r} 0 0 0 ${tx - r * 0.5},${ty + r * 0.86}`, fill: 'none', stroke: COL.echo, 'stroke-width': 2.2, opacity: Math.min(1, share * 1.2) * fade }));
    }
    if (target === MIDGE) {
      parts.push(svg('ellipse', { cx: tx, cy: ty, rx: 1.5 * px, ry: 0.5 * px, fill: COL.moth }), line(tx - 2, ty - 2, tx + 4, ty - 7, COL.moth, 1), line(tx - 2, ty + 2, tx + 4, ty + 7, COL.moth, 1));
    } else {
      const s = 20 * px;
      parts.push(
        svg('ellipse', { cx: tx, cy: ty - s / 2, rx: 14, ry: s / 2 - 6, fill: tint(COL.moth, 0.8) }),
        svg('ellipse', { cx: tx, cy: ty + s / 2, rx: 14, ry: s / 2 - 6, fill: tint(COL.moth, 0.8) }),
        svg('ellipse', { cx: tx, cy: ty, rx: 5, ry: 14, fill: COL.moth }),
      );
    }
    parts.push(
      svg('rect', { x: 0, y: 178, width: W, height: 22, fill: COL.paper }),
      line(24, 186, 24 + lam, 186, COL.ink, 1.2),
      line(24, 182, 24, 190, COL.ink, 1.2),
      line(24 + lam, 182, 24 + lam, 190, COL.ink, 1.2),
      small(30 + lam, 190, `one wavelength, ${wavelength(khz).toFixed(1)} mm`, {}),
      small(392, 190, target === MIDGE ? 'midge 3 mm long' : 'moth, wings 4 cm across', { anchor: 'end', soft: true }),
      label(14, 12, 'call →', { size: 'small', bold: true, fill: COL.call }),
      label(110, 12, `← echo, ${share >= 0.995 ? 'full strength' : `${share < 0.01 ? (share * 100).toFixed(1) : Math.round(share * 100)}% of full strength`}`, { size: 'small', bold: true, fill: COL.echo }),
    );
    redraw(g, ...parts);
  };

  const describe = () => {
    const share = echoShare(khz, target);
    if (target === MOTH) return `At ${khz} kHz the waves are ${wavelength(khz).toFixed(0)} mm long, shorter than the moth's 4 cm wings, so it sends back a full echo. Big insects echo at any pitch a bat uses.`;
    if (share < 0.05) return `At ${khz} kHz each wave is ${wavelength(khz).toFixed(0)} mm long, several times the midge. The waves wash past it almost untouched, and its echo is ${(share * 100).toFixed(1)}% of full strength.`;
    if (share < 0.5) return `At ${khz} kHz the waves are ${wavelength(khz).toFixed(1)} mm long, closer to the midge's size; its echo has grown to ${Math.round(share * 100)}% of full strength.`;
    return `At ${khz} kHz the waves are ${wavelength(khz).toFixed(1)} mm long, about the midge's size or less, and it bounces back a strong echo, ${share >= 0.995 ? 'full strength' : `${Math.round(share * 100)}%`}.`;
  };

  const update = () => {
    const share = echoShare(khz, target);
    if (target === MIDGE && share < 0.05) sawWeak = true;
    if (target === MIDGE && share >= 0.5) sawStrong = true;
    paint();
    const next = target !== MIDGE || (sawWeak && sawStrong) ? ''
      : !sawStrong ? ' Raise the pitch until the midge echoes strongly.'
        : ' Now lower the pitch until the echo almost vanishes.';
    f.readout.textContent = describe() + next;
    if (sawWeak && sawStrong) t.done();
  };

  const fs = slider('Pitch of the call', 10, 120, 1, khz, (v) => `${v} kHz`, (v) => { khz = v; update(); }, 'call');
  const which = named(pick(['Midge', 'Moth'], 0, (i) => { target = i === 0 ? MIDGE : MOTH; update(); }), 'Insect:');
  f.controls.append(fs.node, which.node);
  update();
  animate(f.node, ctx, (dt) => {
    phase += dt * 0.8;
    paint();
  });
  return f.node;
});

// ---- The trade-off: small prey against long range (guess first) ------------------------------------

export const tradeoffFigure = figure(['both'], (_ctx, t) => {
  const f = frame(W, 236, 3);
  const g = svg('g');
  f.svg.append(g);
  // It starts where neither insect is heard, so both have to be found.
  let khz = 100;
  let midgeAt: number | null = null;
  let mothAt: number | null = null;
  const ax = axes({
    x: 44, y: 22, w: 330, h: 150, xmin: 10, xmax: 120, ymin: 0.5, ymax: 40, ylog: true,
    xlabel: 'pitch of the call, kHz', ylabel: 'farthest it is heard, m',
    xticks: [20, 40, 60, 80, 100, 120], yticks: [0.5, 1, 2, 5, 10, 20, 40], ink: COL.ink, grid: COL.grid,
  });
  const freqs = Array.from({ length: 111 }, (_, i) => 10 + i);
  const curve = (tg: Target) => freqs.map((q) => [q, Math.max(0.3, reach(q, tg))] as [number, number]);

  const paint = () => {
    const parts: SVGElement[] = [
      ...ax.parts,
      ax.path(curve(MOTH), COL.moth, 2.2),
      ax.path(curve(MIDGE), COL.moth, 2.2, { 'stroke-dasharray': '5 3' }),
      small(ax.X(14), ax.Y(reach(14, MOTH)) - 6, 'moth', { fill: COL.moth, bold: true }),
      small(ax.X(66), ax.Y(reach(66, MIDGE)) - 6, 'midge', { fill: COL.moth, bold: true }),
      svg('circle', { cx: ax.X(khz), cy: ax.Y(2), r: 4, fill: heard(khz, MIDGE, 2) ? COL.good : COL.paper, stroke: COL.ink, 'stroke-width': 1 }),
      svg('circle', { cx: ax.X(khz), cy: ax.Y(10), r: 4, fill: heard(khz, MOTH, 10) ? COL.good : COL.paper, stroke: COL.ink, 'stroke-width': 1 }),
      line(ax.X(khz), ax.Y(40), ax.X(khz), ax.Y(0.5), COL.call, 1.6),
      small(ax.X(khz) + 6, ax.Y(2) + 3, 'midge at 2 m', {}),
      small(ax.X(khz) + 6, ax.Y(10) + 3, 'moth at 10 m', {}),
    ];
    parts.push(
      small(10, 222, midgeAt === null ? '○ midge at 2 m: not found yet' : `✓ midge at 2 m found at ${midgeAt} kHz`, { bold: midgeAt !== null, fill: midgeAt === null ? COL.soft : COL.good }),
      small(210, 222, mothAt === null ? '○ moth at 10 m: not found yet' : `✓ moth at 10 m found at ${mothAt} kHz`, { bold: mothAt !== null, fill: mothAt === null ? COL.soft : COL.good }),
    );
    redraw(g, ...parts);
    if (!open()) return;
    const m = echoLevel(khz, MIDGE, 2);
    const o = echoLevel(khz, MOTH, 10);
    const say = (lv: number) => (lv >= THRESHOLD ? `heard (${Math.round(lv)} dB)` : `too faint (${Math.round(lv)} dB)`);
    f.readout.textContent = `${khz} kHz: waves ${wavelength(khz).toFixed(1)} mm long; the air takes ${absorption(khz).toFixed(1)} dB a metre. Midge at 2 m ${say(m)}; moth at 10 m ${say(o)}. The bat needs ${THRESHOLD} dB.`;
  };
  const update = () => {
    if (heard(khz, MIDGE, 2) && midgeAt === null) midgeAt = khz;
    if (heard(khz, MOTH, 10) && mothAt === null) mothAt = khz;
    paint();
    if (midgeAt !== null && mothAt !== null) t.done();
  };
  const fs = slider('Pitch of the call', 10, 120, 1, khz, (v) => `${v} kHz`, (v) => { khz = v; if (open()) update(); }, 'call');
  f.controls.append(fs.node);
  const open = guessFirst(t, f, {
    ask: 'A midge 3 mm long hangs 2 m ahead of a bat. Which call is most likely to find it?',
    options: ['20 kHz: low sounds carry farthest', 'About 50 kHz', '120 kHz: the shortest waves'],
    answer: 1,
    sliders: [fs],
    reveal: 'done',
    after: () => update(),
  });
  paint();
  return f.node;
});

// ---- Sweeps and steady tones: a sonogram -------------------------------------------------------------

export interface BatCall {
  name: string;
  kind: 'FM' | 'CF';
  /** How long each call lasts and how often one starts, in seconds. */
  length: number;
  every: number;
  /** The calls in a fifth of a second, real time. */
  calls: Call[];
}

/** A steady tone with a short rise at the start and a sweep down at the end, as a horseshoe bat calls. */
const cf = (at: number): Call[] => [
  { at, dur: 0.002, from: 76000, to: 83000 },
  { at: at + 0.002, dur: 0.045, from: 83000, to: 83000 },
  { at: at + 0.047, dur: 0.003, from: 83000, to: 68000 },
];

/** Search calls, from published ranges: start, end and length are typical, not one bat's. */
export const CALLS: BatCall[] = [
  { name: 'Big brown bat', kind: 'FM', length: 0.008, every: 0.12, calls: [0.01, 0.13].map((at) => ({ at, dur: 0.008, from: 55000, to: 25000 })) },
  { name: 'Yuma myotis', kind: 'FM', length: 0.004, every: 0.08, calls: [0.01, 0.09, 0.17].map((at) => ({ at, dur: 0.004, from: 90000, to: 48000 })) },
  { name: 'Greater horseshoe bat', kind: 'CF', length: 0.05, every: 0.08, calls: [0.01, 0.09, 0.17].flatMap(cf) },
];

/** The share of the time a bat is calling: low for sweeps, high for steady tones. */
export const dutyCycle = (b: BatCall): number => b.length / b.every;

/** How many bright glints a moth beating its wings `hz` times a second puts in an echo `dur` seconds long (one a beat, as the wings face the bat). */
export const glints = (dur: number, hz = 40): number => Math.floor(dur * hz);

export const callsFigure = figure(['compare'], (_ctx, t) => {
  const f = frame(W, 226, 4);
  const g = svg('g');
  f.svg.append(g);
  let which = 0;
  let echo = false;
  const seen = { FM: false, CF: false };
  const ax = axes({
    x: 40, y: 18, w: 350, h: 130, xmin: 0, xmax: 200, ymin: 0, ymax: 120,
    xlabel: 'time, ms', ylabel: 'kHz', xticks: [0, 50, 100, 150, 200], yticks: [0, 20, 40, 60, 80, 100, 120], ink: COL.ink, grid: COL.grid,
  });
  const delay = 0.006; // the echo of a moth 1 m away
  const lane = { y: 220, h: 24 };

  const paint = () => {
    const b = CALLS[which];
    const parts: SVGElement[] = [...ax.parts];
    // Each call is a line from where it starts to where it ends, in pitch.
    for (const c of b.calls) {
      const at = c.at * 1000;
      if (at > 200) continue;
      const end = Math.min(200, at + c.dur * 1000);
      parts.push(ax.path([[at, c.from / 1000], [end, c.to / 1000]], COL.call, 3));
      if (echo) parts.push(ax.path([[at + delay * 1000, c.from / 1000 - 2], [Math.min(200, end + delay * 1000), c.to / 1000 - 2]], COL.echo, 2, { 'stroke-dasharray': '3 2' }));
    }
    // The echo's loudness over time: glints where the moth's wings face the bat.
    parts.push(small(40, lane.y - lane.h - 6, echo ? 'echo from a moth beating its wings 40 times a second' : 'echo: turn on the moth', { soft: !echo, fill: echo ? COL.echo : undefined }), line(40, lane.y, 390, lane.y, COL.grid, 1));
    if (echo) {
      const X = (ms: number) => 40 + (ms / 200) * 350;
      const groups: [number, number][] = [];
      for (const c of b.calls) {
        const at = c.at + delay;
        const last = groups[groups.length - 1];
        if (last && Math.abs(last[1] - at) < 1e-9) last[1] = at + c.dur;
        else groups.push([at, at + c.dur]);
      }
      for (const [s, e] of groups) {
        const pts: [number, number][] = [];
        for (let ms = s * 1000; ms <= Math.min(200, e * 1000); ms += 0.25) {
          const phase = ((ms / 1000) * 40) % 1;
          const glint = Math.exp(-Math.pow((phase - 0.5) / 0.03, 2));
          pts.push([X(ms), lane.y - lane.h * (0.25 + 0.75 * glint)]);
        }
        if (pts.length) parts.push(svg('polyline', { points: [[pts[0][0], lane.y], ...pts, [pts[pts.length - 1][0], lane.y]].map((p) => p.join(',')).join(' '), fill: tint(COL.echo, 0.35), stroke: COL.echo, 'stroke-width': 1 }));
      }
    }
    parts.push(label(390, 30, `${b.name}: ${b.kind === 'FM' ? 'sweeps' : 'steady tone'}`, { anchor: 'end', bold: true, size: 'small' }));
    redraw(g, ...parts);
    const callMs = b.length * 1000;
    const duty = Math.round(dutyCycle(b) * 100);
    f.readout.textContent = b.kind === 'FM'
      ? `Each call sweeps from ${b.calls[0].from / 1000} down to ${b.calls[0].to / 1000} kHz in ${callMs} ms, and the bat is calling ${duty}% of the time. ${echo ? `An echo this short catches at most ${Math.max(1, glints(b.length))} glint from the wings, or none.` : ''}`
      : `Each call holds 83 kHz for about ${callMs} ms, and the bat is calling ${duty}% of the time. ${echo ? `Its long echo catches ${glints(b.length)} glints as the wings beat: the mark of a flying insect.` : ''}`;
    if (echo) seen[b.kind] = true;
    f.readout.textContent = (f.readout.textContent ?? '').trimEnd();
    if (!echo) f.readout.textContent += ' Tap Moth echo to add the echo.';
    else if (!seen.CF) f.readout.textContent += ' Now pick the greater horseshoe bat.';
    else if (!seen.FM) f.readout.textContent += ' Now pick a bat that sweeps.';
    if (seen.FM && seen.CF) t.done();
  };
  const bats = named(pick(CALLS.map((b) => b.name), 0, (i) => { which = i; paint(); }), 'Bat:');
  const tg = toggles(['Moth echo'], [false], (on) => { echo = on[0]; paint(); });
  const play = playButton('Play slowed ten times', () => CALLS[which].calls);
  const row = document.createElement('div');
  row.className = 'chips';
  row.append(play, ...tg.buttons);
  f.controls.append(bats.node, row);
  paint();
  return f.node;
});

export const FIGS: Record<string, FigureFactory> = {
  'ultra-waves': wavesFigure,
  'ultra-tradeoff': tradeoffFigure,
  'ultra-calls': callsFigure,
};

