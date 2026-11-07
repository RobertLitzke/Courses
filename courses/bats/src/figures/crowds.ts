// Lesson 5, Twenty million voices: an evening emergence spreading over the
// weather radar (a time lapse), the Doppler shift built from wavefronts
// (moving source, moving listener, an echo), a horseshoe bat lowering its call
// to keep the echo in its acoustic fovea, and two bats jamming each other.

import { svg } from 'didactics/dom';
import { label, line, redraw, small } from 'didactics/draw';
import { animate, COL, figure, frame, guessFirst, pick, player, slider, tint, toggles, wrapped, type FigureFactory } from './kit';
import { batShape, mothShape, SOUND } from './buzz';

const W = 400;

// ---- Doppler -------------------------------------------------------------------

/** The pitch heard from a source moving toward the listener at `v` m/s (negative: away). */
export const fromMovingSource = (f: number, v: number, c = SOUND) => (f * c) / (c - v);
/** The pitch heard by a listener moving toward a still source at `v` m/s. */
export const byMovingListener = (f: number, v: number, c = SOUND) => (f * (c + v)) / c;
/** The pitch of the echo a bat hears from a still wall it flies toward at `v` m/s: shifted twice. */
export const echoPitch = (f: number, v: number, c = SOUND) => byMovingListener(fromMovingSource(f, v, c), v, c);
/** The call a bat flying at `v` must make for its echo to come back at `target`. */
export const compensatedCall = (target: number, v: number, c = SOUND) => (target * (c - v)) / (c + v);

/** The greater horseshoe bat's acoustic fovea: the narrow band of its sharpest hearing, hertz. */
export const FOVEA = { centre: 83000, half: 200 } as const;
export const inFovea = (f: number) => Math.abs(f - FOVEA.centre) <= FOVEA.half;

let clipIds = 0;

export const wavesFigure = figure(['all'], (ctx, t) => {
  const f = frame(W, 214, 4);
  const g = svg('g');
  const id = `crowds-clip-${++clipIds}`;
  const WALL = 340;
  f.svg.append(
    svg('defs', {},
      svg('clipPath', { id: `${id}-out` }, svg('rect', { x: 0, y: 0, width: WALL, height: 190 })),
      svg('clipPath', { id: `${id}-all` }, svg('rect', { x: 0, y: 0, width: W, height: 190 })),
    ),
    g,
  );
  let mode = 0;
  let share = 0.3; // speed as a share of the speed of sound
  let phase = 0;
  const seen = [false, false, false];
  const C = 34; // pixels per period: the wavelength when nothing moves
  const paint = () => {
    const v = share * C; // pixels per period
    const circles: SVGElement[] = [];
    const echoes: SVGElement[] = [];
    const Y = 100;
    const N = 14;
    let who: SVGElement[] = [];
    let ratio = 1;
    if (mode === 0) {
      const x0 = 200;
      for (let k = 0; k < N; k++) {
        const age = k + phase;
        circles.push(svg('circle', { cx: x0 - v * age, cy: Y, r: C * age, fill: 'none', stroke: COL.call, 'stroke-width': 1.3, opacity: 1 - k / N }));
      }
      ratio = 1 / (1 - share);
      who = [batShape(x0, Y), small(x0, Y + 22, 'moving →', { anchor: 'middle', soft: true }), ear(370, Y, 'ahead'), ear(30, Y, 'behind')];
    } else if (mode === 1) {
      const x0 = 60;
      for (let k = 0; k < N; k++) {
        const age = k + phase;
        circles.push(svg('circle', { cx: x0, cy: Y, r: C * age, fill: 'none', stroke: COL.call, 'stroke-width': 1.3, opacity: 1 - k / N }));
      }
      ratio = 1 + share;
      who = [batShape(x0, Y, 1, COL.soft), small(x0, Y + 22, 'still', { anchor: 'middle', soft: true }), ear(300, Y, '← listener moving')];
    } else {
      const x0 = 120;
      for (let k = 0; k < N; k++) {
        const age = k + phase;
        const cx = x0 - v * age;
        const r = C * age;
        circles.push(svg('circle', { cx, cy: Y, r, fill: 'none', stroke: COL.call, 'stroke-width': 1.3, opacity: 1 - k / N }));
        // Past the wall, the crest comes back as if from the bat's mirror image.
        if (cx + r > WALL) echoes.push(svg('circle', { cx: 2 * WALL - cx, cy: Y, r, fill: 'none', stroke: COL.echo, 'stroke-width': 1.6, opacity: 1 - k / N }));
      }
      ratio = (1 + share) / (1 - share);
      who = [
        svg('rect', { x: WALL, y: 20, width: 14, height: 160, fill: COL.rock }),
        small(WALL + 7, 196, 'wall', { anchor: 'middle', soft: true }),
        batShape(x0, Y), small(x0, Y + 22, 'moving →', { anchor: 'middle', soft: true }),
      ];
    }
    redraw(g,
      svg('g', { 'clip-path': `url(#${id}-${mode === 2 ? 'out' : 'all'})` }, ...circles),
      svg('g', { 'clip-path': `url(#${id}-out)` }, ...echoes),
      ...who,
      small(8, 14, `speed: ${Math.round(share * 100)}% of the speed of sound`, { bold: true }),
      small(392, 14, mode === 2 ? 'call violet, echo teal' : 'crests of the call', { anchor: 'end', soft: true }),
    );
    if (share > 0.05) seen[mode] = true;
    const left = seen.filter((v) => !v);
    g.append(small(8, 208, `tried: ${['source', 'listener', 'wall'].map((n, k) => `${seen[k] ? '✓' : '○'} ${n}`).join('   ')}`, { soft: !seen.every(Boolean), bold: true, fill: seen.every(Boolean) ? COL.good : undefined }));
    const heard = (r: number) => `a 40 kHz call heard at ${(40 * r).toFixed(1)} kHz`;
    f.readout.textContent = [
      `The bat chases its own crests ahead and leaves them behind, so they bunch up in front. Ahead: ${heard(ratio)}. Behind: ${heard(1 / (1 + share))}.`,
      `The crests are evenly spaced, but a listener running into them meets them more often than they were sent: ${heard(ratio)}.`,
      `The wall hears bunched crests and sends them back; the bat then runs into the echo. Shifted twice: ${heard(ratio)}, ${Math.round((ratio - 1) * 100)}% higher.`,
    ][mode] + (share <= 0.05 ? ' Raise the speed to see the crests bunch.' : left.length ? '' : ' A real bat at 5 m/s goes 1.5% of the speed of sound.');
    if (seen.every(Boolean)) t.done();
  };
  const chips = pick(['Moving source', 'Moving listener', 'Echo from a wall'], 0, (i) => { mode = i; paint(); });
  const s = slider('Speed', 0, 50, 1, share * 100, (v) => `${v}% of sound`, (v) => { share = v / 100; paint(); }, 'bat');
  f.controls.append(chips.node, s.node);
  animate(f.svg, ctx, (dt) => {
    phase = (phase + dt * 0.8) % 1;
    paint();
  });
  paint();
  return f.node;
});

/** An ear, drawn as a small listening mark with its words. */
function ear(x: number, y: number, words: string): SVGElement {
  return svg('g', {},
    svg('path', { d: `M${x - 5},${y - 8} Q${x + 7},${y - 10} ${x + 5},${y} Q${x + 3},${y + 6} ${x - 2},${y + 9}`, fill: 'none', stroke: COL.ink, 'stroke-width': 2 }),
    small(x, y + 24, words, { anchor: 'middle', soft: true }),
  );
}

// ---- Doppler compensation -------------------------------------------------------

export const compensationFigure = figure(['fovea'], (_ctx, t) => {
  const f = frame(W, 200, 3);
  const g = svg('g');
  f.svg.append(g);
  let speed = 5;
  let lower = false;
  let sawMiss = false;
  const LO = 78000;
  const HI = 88000;
  const X = (hz: number) => 20 + ((hz - LO) / (HI - LO)) * 360;
  const BASE = 150;
  // How sharply the ear is tuned: a broad low hump, and the fovea's tall narrow peak.
  const ear = (hz: number) => 0.18 * Math.exp(-(((hz - 82000) / 5000) ** 2)) + 0.82 * Math.exp(-(((hz - FOVEA.centre) / (FOVEA.half * 1.2)) ** 2));
  const curve: string[] = [];
  for (let hz = LO; hz <= HI; hz += 25) curve.push(`${X(hz).toFixed(1)},${(BASE - ear(hz) * 100).toFixed(1)}`);
  const paint = () => {
    const call = lower ? compensatedCall(FOVEA.centre, speed) : FOVEA.centre;
    const echo = echoPitch(call, speed);
    const hit = inFovea(echo);
    const mark = (hz: number, color: string, words: string, y: number) => [
      line(X(hz), BASE, X(hz), y, color, 2.5),
      small(X(hz), y - 5, words, { anchor: hz > 86500 ? 'end' : hz < 79500 ? undefined : 'middle', fill: color, bold: true }),
    ];
    redraw(g,
      svg('rect', { x: X(FOVEA.centre - FOVEA.half), y: 30, width: X(FOVEA.centre + FOVEA.half) - X(FOVEA.centre - FOVEA.half), height: BASE - 30, fill: tint(COL.echo, 0.15) }),
      svg('polyline', { points: curve.join(' '), fill: 'none', stroke: COL.soft, 'stroke-width': 1.5 }),
      small(X(FOVEA.centre) + 6, 40, 'fovea', { soft: true }),
      line(20, BASE, 380, BASE, COL.ink, 1.2),
      ...[78, 80, 82, 84, 86, 88].map((k) => small(X(k * 1000), BASE + 14, `${k}`, { anchor: 'middle', soft: true })),
      small(380, BASE + 28, 'kHz', { anchor: 'end', soft: true }),
      small(20, 22, 'how keenly the bat hears each pitch', { soft: true }),
      ...(open() ? [
        ...mark(call, COL.call, `call ${(call / 1000).toFixed(1)}`, 112),
        ...mark(echo, hit ? COL.echo : COL.bad, `echo ${(echo / 1000).toFixed(2)}`, 76),
      ] : []),
      label(380, 22, open() ? (hit ? 'echo in the fovea' : 'echo misses the fovea') : '', { anchor: 'end', bold: true, fill: hit ? COL.good : COL.bad }),
    );
    if (!open()) return;
    if (!hit && speed >= 2) sawMiss = true;
    const off = Math.round(echo - FOVEA.centre);
    f.readout.textContent = lower
      ? `Flying at ${speed} m/s, the bat calls at ${(call / 1000).toFixed(2)} kHz, ${((FOVEA.centre - call) / 1000).toFixed(2)} kHz below its usual note, and the echo comes back at ${(echo / 1000).toFixed(2)} kHz, in its sharpest hearing.`
      : speed === 0
        ? 'Hanging still, the bat calls at 83 kHz and the echo of anything still comes back at 83 kHz, in the fovea.'
        : `Flying at ${speed} m/s and calling at 83 kHz, the echo comes back ${off} Hz higher, outside a band only a few hundred hertz wide. Tap Lower the call.`;
    if (sawMiss && lower && hit && speed >= 2) t.done();
  };
  const s = slider('Bat speed', 0, 8, 0.5, speed, (v) => `${v} m/s`, (v) => { speed = v; paint(); }, 'bat');
  const comp = toggles(['Lower the call'], [false], (on) => { lower = on[0]; paint(); });
  f.controls.append(s.node, comp.node);
  const open = guessFirst(t, f, {
    ask: 'A horseshoe bat flies toward a wall at 5 m/s and calls at 83 kHz. Where does the echo come back?',
    options: ['At 83 kHz, unchanged', 'About 83.2 kHz', 'About 85.4 kHz'],
    answer: 2,
    sliders: [s],
    buttons: comp.buttons,
    hidden: [comp.node],
    after: () => paint(),
  });
  paint();
  return f.node;
});

// ---- Jamming -----------------------------------------------------------------------

/** The width of each bat's search call and of the band it listens in, hertz. */
export const BAND = 2000;
/** How much of bat A's listening band (centred on `a`) a neighbour calling at `b` covers, 0 to 1. */
export const overlap = (a: number, b: number, band = BAND) => Math.max(0, Math.min(1, 1 - Math.abs(a - b) / band));

export const jamFigure = figure(['clear'], (_ctx, t) => {
  const f = frame(W, 220, 4);
  const g = svg('g');
  f.svg.append(g);
  let A = 26400;
  const b = 26000;
  let jamCall = false;
  let cleared = false;
  const LO = 18000;
  const HI = 36000;
  const X = (hz: number) => 20 + ((hz - LO) / (HI - LO)) * 360;
  const BASE = 196;
  const paint = () => {
    const o = jamCall ? 1 : overlap(A, b);
    const jammed = o > 0;
    // Labels beside each band, on the side away from the other bat's, so they never overlap.
    const aRight = A >= b;
    const beside = (centre: number, right: boolean, y: number, words: string, color: string, bold = true) =>
      small(right ? X(centre + BAND / 2) + 4 : X(centre - BAND / 2) - 4, y, words, { anchor: right ? undefined : 'end', fill: color, bold });
    const bandRect = (centre: number, color: string, top: number, words: string, right: boolean) => [
      svg('rect', { x: X(centre - BAND / 2), y: top, width: X(centre + BAND / 2) - X(centre - BAND / 2), height: BASE - top, fill: tint(color, 0.35), stroke: color, 'stroke-width': 1.2 }),
      beside(centre, right, top + 12, words, color),
    ];
    // B's jamming call: a wavering sweep across A's band.
    const sweep: string[] = [];
    for (let k = 0; k <= 60; k++) {
      const hz = A - 4000 + 8000 * (k / 60);
      sweep.push(`${X(hz).toFixed(1)},${(118 + 10 * Math.sin(k * 0.9)).toFixed(1)}`);
    }
    redraw(g,
      // The scene: A chasing a moth, B close by.
      batShape(70, 40), small(70, 62, 'bat A', { anchor: 'middle', soft: true }), mothShape(170, 34),
      batShape(110, 76, 0.9), small(110, 96, 'bat B, 2 m away', { anchor: 'middle', soft: true }),
      svg('path', { d: 'M86,34 Q96,26 86,18', fill: 'none', stroke: COL.call, 'stroke-width': 1.5 }),
      svg('path', { d: 'M160,40 Q150,32 160,24', fill: 'none', stroke: COL.echo, 'stroke-width': 1.5 }),
      svg('path', { d: 'M124,72 Q134,64 124,56', fill: 'none', stroke: COL.noise, 'stroke-width': 1.5 }),
      ...wrapped(214, 26, jamCall ? 'B sends its jamming call into A’s buzz' : jammed ? 'B’s call lands in the band A listens in' : 'Each bat hears its own echoes clearly', 26, { bold: true, fill: jamCall || jammed ? COL.bad : COL.good }),
      // The spectrum: what A hears, by pitch.
      line(20, BASE, 380, BASE, COL.ink, 1.2),
      ...[18, 22, 26, 30, 34].map((k) => small(X(k * 1000), BASE + 13, `${k}`, { anchor: 'middle', soft: true })),
      small(392, BASE + 13, 'kHz', { anchor: 'end', soft: true }),
      svg('rect', { x: X(A - BAND / 2), y: 100, width: X(A + BAND / 2) - X(A - BAND / 2), height: BASE - 100, fill: 'none', stroke: COL.call, 'stroke-width': 1.5, 'stroke-dasharray': '4 3' }),
      beside(A, aRight, 108, 'A listens here', COL.call, false),
      ...bandRect(A, COL.echo, 176, 'A’s echo', aRight),
      ...(jamCall
        ? [svg('polyline', { points: sweep.join(' '), fill: 'none', stroke: COL.noise, 'stroke-width': 3 }), small(X(Math.min(A + 5000, 33000)), 92, 'B’s jamming call', { anchor: 'middle', fill: COL.noise, bold: true })]
        : bandRect(b, COL.noise, 128, 'B’s call', !aRight)),
    );
    if (!jamCall && o === 0) cleared = true;
    f.readout.textContent = jamCall
      ? 'Mexican free-tailed bats have a call for this: a wavering sweep that covers the pitches of a rival\'s buzz just as it closes on a moth. The rival misses far more often.'
      : jammed
        ? `A calls at ${(A / 1000).toFixed(1)} kHz and B at ${(b / 1000).toFixed(1)}, inside the band A listens in. B's call is far louder than A's echo from the moth, which is lost under it. Slide A's call away from B's.`
        : `A has moved its call to ${(A / 1000).toFixed(1)} kHz, clear of B's. A's faint echo is now the loudest thing in the band it listens in, and the two bats can hunt side by side.`;
    if (cleared) t.done();
  };
  const s = slider('Bat A’s call', 20000, 32000, 100, A, (v) => `${(v / 1000).toFixed(1)} kHz`, (v) => { A = v; paint(); }, 'call');
  const jc = toggles(['Show B’s jamming call'], [false], (on) => { jamCall = on[0]; paint(); });
  f.controls.append(s.node, jc.node);
  paint();
  return f.node;
});

// ---- The emergence on radar (time lapse) -----------------------------------------

/** Minutes from the first bats out to the last, in the model. */
export const EMERGE_MINUTES = 150;
/** How fast the cloud of bats spreads from the cave, km a minute (about 30 km an hour). */
export const SPREAD = 0.5;

/** The share of the colony that leaves in the minute around `m` (a smooth rise and fall over 150 minutes). */
export const emergeRate = (m: number) => (m < 0 || m > EMERGE_MINUTES ? 0 : (Math.PI / (2 * EMERGE_MINUTES)) * Math.sin((Math.PI * m) / EMERGE_MINUTES));
/** The share of the colony out of the cave by minute `m`. */
export const emerged = (m: number) => (m <= 0 ? 0 : m >= EMERGE_MINUTES ? 1 : (1 - Math.cos((Math.PI * m) / EMERGE_MINUTES)) / 2);
/** How dense the bats are, in the model, `km` from the cave at minute `m`: those that left `km / SPREAD` minutes ago, spread round a ring. */
export const density = (km: number, m: number) => emergeRate(m - km / SPREAD) / Math.max(km, 2);

export const radarFigure = figure(['end'], (ctx, t) => {
  const f = frame(W, 250, 2);
  const g = svg('g');
  f.svg.append(g);
  const CAVE: [number, number] = [170, 130];
  const PX = 1.6; // pixels a kilometre
  const RADAR: [number, number] = [CAVE[0] + 31 * PX, CAVE[1] - 1 * PX];
  const CITY: [number, number] = [CAVE[0] - 13 * PX, CAVE[1] + 30 * PX];
  const PEAK = density(2, EMERGE_MINUTES / 2 + 4);
  let minute = 0;
  const paint = () => {
    const rings: SVGElement[] = [];
    for (let km = 120; km >= 0; km -= 3) {
      const a = Math.min(0.85, density(km + 1.5, minute) / PEAK);
      if (a < 0.02) continue;
      rings.push(svg('circle', { cx: CAVE[0], cy: CAVE[1], r: (km + 3) * PX, fill: tint(COL.bat, a), stroke: 'none' }));
    }
    redraw(g,
      svg('rect', { x: 0, y: 0, width: W, height: 250, fill: tint(COL.plant, 0.06) }),
      ...[40, 80].map((km) => svg('circle', { cx: RADAR[0], cy: RADAR[1], r: km * PX, fill: 'none', stroke: COL.grid, 'stroke-dasharray': '3 3' })),
      ...rings,
      svg('circle', { cx: CITY[0], cy: CITY[1], r: 4, fill: COL.ink }), small(CITY[0] + 7, CITY[1] + 4, 'San Antonio'),
      svg('circle', { cx: CAVE[0], cy: CAVE[1], r: 3.5, fill: '#fff', stroke: COL.ink }), small(CAVE[0] - 6, CAVE[1] - 6, 'Bracken Cave', { anchor: 'end', bold: true, halo: '#fff' }),
      svg('path', { d: `M${RADAR[0]},${RADAR[1] - 7} L${RADAR[0] - 5},${RADAR[1] + 4} L${RADAR[0] + 5},${RADAR[1] + 4} Z`, fill: COL.ink }),
      small(RADAR[0] + 8, RADAR[1] + 4, 'radar, New Braunfels', { halo: '#fff' }),
      line(300, 236, 300 + 40 * PX, 236, COL.ink, 2), small(300 + 20 * PX, 230, '40 km', { anchor: 'middle' }),
      label(10, 20, `${Math.floor(minute / 60)} h ${String(Math.round(minute % 60)).padStart(2, '0')} min`, { bold: true }),
      small(10, 34, `${Math.round(emerged(minute) * 100)}% of the colony out`, { soft: true }),
    );
    const front = Math.min(minute * SPREAD, 120);
    f.readout.textContent = minute === 0
      ? 'Late afternoon: the first bats spiral out of the cave mouth. Press Play.'
      : minute < EMERGE_MINUTES
        ? `Bats still pouring out; the first ones are about ${Math.round(front)} km away, high enough for the radar beam to catch them.`
        : `The cave is empty. The ring spreads ${Math.round(front)} km and thins as the bats scatter to feed over farms and towns.`;
    if (minute >= 239) t.done();
  };
  const s = slider('Time', 0, 240, 1, 0, (v) => `${v} min`, (v) => { minute = v; paint(); }, 'bat');
  const p = player(s, ctx, { seconds: 14 });
  f.controls.append(p.node, s.node);
  paint();
  return f.node;
});

export const FIGS: Record<string, FigureFactory> = {
  'crowds-radar': radarFigure,
  'crowds-waves': wavesFigure,
  'crowds-compensation': compensationFigure,
  'crowds-jam': jamFigure,
};
