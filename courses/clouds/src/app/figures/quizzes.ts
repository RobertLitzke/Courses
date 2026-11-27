// Figures that work on whole clouds rather than the air inside them: filing
// drawn clouds onto their floors, building names from their roots, look-alikes
// side by side in photos, and the check that ends a lesson (real photos to
// name, then skies to forecast from, as one run of questions).

import type { Forecast, PhotoCalls, Profile } from '../../core/lessons';
import { compose, floorInfo, genus, type Body, type Floor, type GenusId, type Prefix } from '../../core/clouds';
import { dealFloorCalls } from '../../core/photo-call';
import { dealNameCalls } from '../../core/name-calls';
import { shuffle, type Rng } from 'didactics/rng';
import { check, type CheckStep } from 'didactics/check';
import { el, svg } from 'didactics/dom';
import { photoFigure, PHOTOS } from '../photos';
import { addToSky, drawCloud, placeCloud, SKY_SPOTS } from '../scene/drawn';
import { forecastSky } from '../scene/forecast-sky';
import { FLOOR_BANDS, makeScene, W as SW, type Palette } from '../scene/landscape';
import { line, note } from './draw';
import { COL, height, quiz, textBox, type FigureContext, type FigureFactory } from './kit';

function bands(ctx: FigureContext, onPick?: (f: Floor) => void): SVGElement {
  const g = svg('g', { class: 'bands' });
  for (const id of ['high', 'middle', 'low'] as const) {
    const b = FLOOR_BANDS[id];
    const info = floorInfo(id);
    const rect = svg('rect', { x: 0, y: b.top, width: SW, height: b.bottom - b.top, class: `band band-${id}` });
    if (onPick) rect.addEventListener('click', () => onPick(id));
    const range = id === 'low' ? `below ${height(info.toM, ctx.save.units)}` : id === 'high' ? `above ${height(info.fromM, ctx.save.units)}` : `${height(info.fromM, ctx.save.units)} – ${height(info.toM, ctx.save.units)}`;
    const text = svg('text', { x: 8, y: b.top + 14, class: 'band-label' });
    text.textContent = `${info.name.toUpperCase()} · ${range}`;
    g.append(rect, text);
  }
  return g;
}

function mini(id: GenusId, p: Palette): SVGElement {
  const tall = id === 'cumulonimbus';
  return svg('svg', { viewBox: tall ? '-80 -150 160 185' : '-90 -40 180 70', class: 'mini' }, drawCloud(id, p, 2));
}

const FLOOR_BUTTONS: readonly { id: Floor; label: string }[] = [
  { id: 'high', label: 'High' },
  { id: 'middle', label: 'Middle' },
  { id: 'low', label: 'Low' },
  { id: 'tower', label: 'All three' },
];

function hint(id: GenusId): string {
  switch (genus(id).floor) {
    case 'high': return 'Not quite. Thin, silky streaks are ice, and ice lives up high.';
    case 'middle': return 'Not quite. The pieces are small and shaded, but not as tiny as the high ones.';
    case 'low': return 'Not quite. Crisp, solid edges mean water droplets, close to the ground.';
    case 'tower': return 'Not quite. Look how tall it is: it starts low and punches through everything.';
  }
}

// ---- File clouds onto their floors ------------------------------------------

export const sortFigure = quiz((ctx, t, options) => {
  const clouds = (options?.clouds as GenusId[]) ?? ['cirrus', 'altocumulus', 'stratus', 'cumulus', 'cumulonimbus'];
  const scene = makeScene({ time: 'day', seed: 21, sun: [0.62, 0.3] });
  const p = scene.palette;
  const left = new Set(clouds);
  let picked: GenusId | null = null;
  const xs = [90, 170, 90, 200, 320, 260, 140];
  const feedback = el('p.fig-readout', {}, 'Tap a cloud, then the floor it lives on.');
  const cards = new Map<GenusId, HTMLButtonElement>();
  const tray = el('div.tray');
  for (const id of clouds) {
    const b = el('button.cloud-card', { type: 'button', 'aria-label': genus(id).name }, mini(id, p), el('span', {}, genus(id).name)) as HTMLButtonElement;
    b.addEventListener('click', () => {
      picked = id;
      cards.forEach((c, k) => c.classList.toggle('on', k === id));
      feedback.textContent = `${genus(id).name}: which floor?`;
    });
    cards.set(id, b);
    tray.append(b);
  }
  // A reader coming back finds the clouds they had filed still in the sky.
  const filed: GenusId[] = [];
  const choose = (floor: Floor) => {
    if (!picked) {
      feedback.textContent = 'Pick a cloud first.';
      return;
    }
    const g = genus(picked);
    if (g.floor === floor) {
      const i = clouds.indexOf(picked);
      const spot = SKY_SPOTS[picked];
      addToSky(scene.sky, placeCloud(picked, p, xs[i % xs.length], spot.y, spot.scale * 0.8, i + 3));
      cards.get(picked)!.remove();
      left.delete(picked);
      filed.push(picked);
      t.keep([...filed]);
      feedback.textContent = `Right: ${g.name} lives ${floor === 'tower' ? 'on the low floor and climbs through all three' : `on the ${floor} floor`}.`;
      picked = null;
      if (left.size === 0) t.done();
    } else {
      const card = cards.get(picked)!;
      card.classList.remove('wrong');
      void card.offsetWidth;
      card.classList.add('wrong');
      feedback.textContent = hint(picked);
    }
  };
  scene.sky.append(bands(ctx, choose));
  if (Array.isArray(t.kept)) {
    for (const id of t.kept as GenusId[]) {
      if (!left.has(id)) continue;
      picked = id;
      choose(genus(id).floor);
    }
    feedback.textContent = left.size ? 'Tap a cloud, then the floor it lives on.' : 'All filed.';
  }
  const node = el('div.fig-body', {},
    el('div.fig-scene', {}, scene.root),
    textBox(feedback, 2),
    tray,
    el('div.floor-buttons', {}, FLOOR_BUTTONS.map((f) => el('button.btn.btn-ghost', { type: 'button', onclick: () => choose(f.id) }, f.label))),
  );
  return node;
});

// ---- Build a name -----------------------------------------------------------

export const namesFigure = quiz((_ctx, t, options) => {
  const targets = (options?.targets as { clue: string; prefix: Prefix; body: Body }[]) ?? [];
  const scene = makeScene({ time: 'day', seed: 21, sun: [0.62, 0.3] });
  const p = scene.palette;
  const body = el('div');
  const xs = [110, 250, 190, 320];
  const place = (k: number) => {
    const id = compose(targets[k].prefix, targets[k].body);
    const spot = SKY_SPOTS[id];
    addToSky(scene.sky, placeCloud(id, p, xs[k % xs.length], spot.y, spot.scale * 0.8, 6 + k));
  };
  // Names already called in, from an earlier visit.
  let i = 0;
  if (typeof t.kept === 'number') for (; i < Math.min(t.kept, targets.length); i++) place(i);
  const show = () => {
    if (i >= targets.length) {
      body.replaceChildren(el('p.fig-readout', {}, 'All called in correctly.'));
      t.done();
      return;
    }
    const target = targets[i];
    let prefix: Prefix | null = null;
    let shape: Body | null = null;
    const preview = el('p.name-preview', {}, '…');
    const feedback = el('p.fig-readout');
    const go = el('button.btn', { type: 'button', disabled: true }, 'Call it in') as HTMLButtonElement;
    // The two halves of a name side by side: a height on the left, a texture
    // on the right, one picked from each.
    const column = <T extends string>(title: string, opts: readonly [T, string, string][], set: (v: T) => void) => {
      const buttons = opts.map(([v, root, means]) => el('button.chip', {
        type: 'button',
        onclick: () => {
          set(v);
          buttons.forEach((b, k) => b.classList.toggle('on', opts[k][0] === v));
          paint();
        },
      }, el('b', {}, root), el('small', {}, means)));
      return el('div.name-col', {}, el('p.name-col-title', {}, title), buttons);
    };
    const paint = () => {
      preview.textContent = prefix && shape ? genus(compose(prefix, shape)).name : `${prefix ? (prefix === 'none' ? '' : `${prefix}-`) : '…'}${shape ?? '…'}`;
      go.disabled = !(prefix && shape);
    };
    go.addEventListener('click', () => {
      if (!prefix || !shape) return;
      const said = genus(compose(prefix, shape));
      if (prefix === target.prefix && shape === target.body) {
        place(i);
        i++;
        t.keep(i);
        show();
      } else {
        const where = said.floor === 'tower' ? 'every floor' : `the ${said.floor} floor`;
        feedback.textContent = `${said.name} would be ${shape === 'cumulus' ? 'heaps' : 'a layer'} on ${where}. Read the clue again.`;
      }
    });
    body.replaceChildren(
      el('p.clue', {}, el('span', {}, `Name ${i + 1} of ${targets.length}`), target.clue),
      el('div.name-builder', {},
        column('Height', [['cirro', 'cirro-', 'high'], ['alto', 'alto-', 'middle'], ['none', 'no prefix', 'low']] as const, (v) => (prefix = v)),
        el('span.name-plus', { 'aria-hidden': 'true' }, '+'),
        column('Texture', [['cumulus', 'cumulus', 'heap'], ['stratus', 'stratus', 'layer']] as const, (v) => (shape = v)),
      ),
      el('div.actions', {}, preview, go),
      feedback,
    );
  };
  show();
  return el('div.fig-body', {}, el('div.fig-scene', {}, scene.root), body);
});

// ---- Look-alikes in photos --------------------------------------------------

/**
 * Two real photos side by side: a cloud and the one it is most often taken
 * for (core/clouds.ts `confused`), each named with a few words on what to look
 * for, and the one test that tells them apart in the text box. It comes just
 * before a lesson's check, to carry the clean drawings over to messy photos.
 * options.photos is two { photo, cue }, by photo id; options.tell the test.
 */
export const lookAlikeDiagram: FigureFactory = (_ctx, _goal, options) => {
  const sides = (options?.photos as { photo: string; cue: string }[]) ?? [];
  const pane = (side: { photo: string; cue: string }) => {
    const p = PHOTOS.find((x) => x.id === side.photo);
    if (!p) throw new Error(`No photo ${side.photo}`);
    const g = genus(p.genus);
    const fig = photoFigure(p, `${g.name}: ${side.cue}`);
    fig.querySelector('figcaption')!.prepend(el('p.look-name', {}, el('b', {}, g.name), el('span', {}, side.cue)));
    return fig;
  };
  const tell = el('p.fig-readout', {}, (options?.tell as string) ?? '');
  return { node: el('div.fig-body', {}, el('div.look-alike', {}, sides.map(pane)), textBox(tell, 5)) };
};

// ---- The check -------------------------------------------------------------

function picture(id: GenusId, photo: (typeof PHOTOS)[number] | null, i: number, mirrored: boolean): HTMLElement {
  if (photo) return photoFigure(photo, 'A cloud to identify', mirrored);
  const scene = makeScene({ time: 'day', seed: 30 + i, town: false, sun: [0.15, 0.25] });
  const spot = SKY_SPOTS[id];
  addToSky(scene.sky, placeCloud(id, scene.palette, SW / 2, spot.y, spot.scale, i + 1));
  return el('figure.photo.sketch', {}, scene.root, el('figcaption', {}, el('p.credit', {}, 'A sketch: no photo of this cloud has been fetched yet.')));
}

function photoSteps(o: PhotoCalls, rng: Rng): CheckStep[] {
  const { mode, target } = o;
  const pool = mode === 'spot' ? o.decoys!.flatMap((d) => [target!, d]) : o.pool!;
  const known = o.known ?? pool;
  const count = o.count ?? 5;
  const size = Math.min(4, Math.max(2, known.length));
  const calls = mode === 'floor'
    ? dealFloorCalls(pool, PHOTOS, count, rng).map((c) => ({ ...c, options: FLOOR_BUTTONS.map((b) => b.id as string) }))
    : mode === 'spot'
    ? dealFloorCalls(pool, PHOTOS, count, rng).map((c) => ({ ...c, options: [target!, 'other'] }))
    : dealNameCalls(pool, known, PHOTOS, count, size, rng).map((c) => ({ ...c, options: c.options as string[] }));
  const labelOf = (o: string) => (mode === 'floor' ? FLOOR_BUTTONS.find((b) => b.id === o)!.label : o === 'other' ? 'Something else' : genus(o as GenusId).name);
  return calls.map((call, i) => {
    const g = genus(call.genus);
    const answer = mode === 'floor' ? g.floor : mode === 'spot' && g.id !== target ? 'other' : g.id;
    const where = g.floor === 'tower' ? 'all three floors' : `the ${g.floor} floor`;
    return {
      picture: () => el('div.fig-scene', {}, picture(call.genus, call.photo, i, call.mirrored)),
      ask: mode === 'floor' ? 'A real photo. Which floor is this cloud on?' : mode === 'spot' ? `A real photo. ${genus(target!).name}, or not?` : 'A real photo. What is this cloud?',
      choices: call.options.map(labelOf),
      answer: call.options.indexOf(answer),
      why: `That’s ${g.name}, on ${where}. ${g.look}`,
      row: true,
      // The same words over another photo are another question for review.
      key: `${mode}${target ? `-${target}` : ''}:${call.photo?.id ?? `sketch-${call.genus}`}`,
    };
  });
}

// ---- Forecasting from the sky -----------------------------------------------


/**
 * A slice up through the air: height, the freezing level and temperatures if
 * the profile has them, and the clouds, one over another or, when there are
 * several, side by side to compare.
 */
function profileDrawing(p: Profile): SVGSVGElement {
  const W = 400;
  const H = 170;
  const freeze = p.freezeKm;
  const top = p.topKm ?? Math.max(6, Math.ceil(Math.max(freeze ?? 0, ...p.clouds.map((c) => c.topKm)) + 1));
  const ground = 150;
  const yOf = (km: number) => ground - (km / top) * (ground - 12);
  const tempAt = (km: number) => ((freeze ?? 0) - km) * 6.5;
  const deg = (c: number) => `${c < -0.5 ? '−' : ''}${Math.abs(Math.round(c))} °C`;
  const s = svg('svg', { viewBox: `0 0 ${W} ${H}`, class: 'fig-svg', role: 'img' }) as SVGSVGElement;
  const parts: SVGElement[] = [
    svg('rect', { x: 0, y: 0, width: W, height: ground, fill: COL.air }),
    svg('rect', { x: 0, y: ground, width: W, height: H - ground, fill: COL.ground }),
  ];
  const step = top > 8 ? 2 : 1;
  for (let km = step; km <= top + 1e-9; km += step) {
    parts.push(line(34, yOf(km), 40, yOf(km), COL.ink, 1), note(30, yOf(km) + 3.5, `${km} km`, { soft: true, anchor: 'end' }));
  }
  if (freeze !== undefined) {
    parts.splice(1, 0, svg('rect', { x: 0, y: 0, width: W, height: yOf(freeze), fill: COL.subzero, opacity: 0.6 }));
    parts.push(
      line(40, yOf(freeze), W, yOf(freeze), COL.ice, 1.5, { 'stroke-dasharray': '5 4' }),
      note(W - 6, yOf(freeze) - 5, `0 °C at ${freeze} km: colder above`, { bold: true, anchor: 'end', fill: COL.ice }),
    );
  }
  const apart = p.clouds.length > 1;
  const width = apart ? (W - 80) / p.clouds.length - 30 : 150;
  p.clouds.forEach((c, i) => {
    const x0 = apart ? 80 + i * (width + 30) : 120 + i * 40;
    const y0 = yOf(c.topKm);
    const y1 = yOf(c.baseKm);
    const fill = c.dark ? '#7b7f96' : '#ffffff';
    const ink = c.dark ? '#ffffff' : COL.ink;
    const thick = `${Math.round((c.topKm - c.baseKm) * 1000).toLocaleString('en-US')} m thick`;
    parts.push(
      svg('rect', { x: x0, y: y0, width, height: Math.max(4, y1 - y0), rx: 8, fill, stroke: COL.cloudShade }),
      // Names inside a cloud thick enough to hold them, above a thin one.
      ...(apart && y1 - y0 < 30
        ? [note(x0 + width / 2, y0 - 18, c.name, { bold: true, anchor: 'middle' }), note(x0 + width / 2, y0 - 6, thick, { anchor: 'middle' })]
        : [
          note(x0 + width / 2, (y0 + y1) / 2 + (apart ? -2 : 4), c.name, { bold: true, anchor: 'middle', fill: ink }),
          ...(apart ? [note(x0 + width / 2, (y0 + y1) / 2 + 11, thick, { anchor: 'middle', fill: ink })] : []),
        ]),
      ...(freeze === undefined
        ? []
        : y1 - y0 < 24
        ? [note(x0 - 6, (y0 + y1) / 2 + 4, `${deg(tempAt(c.baseKm))} to ${deg(tempAt(c.topKm))}`, { bold: true, anchor: 'end', fill: tempAt(c.topKm) < 0 ? COL.ice : COL.warmInk })]
        : [
          note(x0 - 6, y0 + 9, `top ${deg(tempAt(c.topKm))}`, { anchor: 'end', fill: tempAt(c.topKm) < 0 ? COL.ice : COL.warmInk }),
          note(x0 - 6, y1, `base ${deg(tempAt(c.baseKm))}`, { anchor: 'end', fill: tempAt(c.baseKm) < 0 ? COL.ice : COL.warmInk }),
        ]),
    );
  });
  parts.push(note(W / 2, ground + 14, p.ground ?? (freeze === undefined ? 'ground' : `ground: ${deg(tempAt(0))}`), { anchor: 'middle', fill: '#fff' }));
  s.append(...parts);
  return s;
}

/** What a forecast question shows above it: the slice through the air, or the sky over the hours. */
export function forecastPicture(q: Forecast): Element {
  if (q.profile) return profileDrawing(q.profile);
  return el('div.sky-strip', {}, (q.sky ?? []).map((s, k) => el('figure', {}, forecastSky(s, k), el('figcaption', {}, s.when))));
}

/**
 * The check that ends a lesson (Didactics' check.ts): options.photos, the
 * real photos to name or place first (PhotoCalls), then options.items, the
 * forecasts, shuffled, with those that have an id last in their order.
 */
export const checkFigure = check((_ctx, options, rng) => {
  const items = (options?.items as Forecast[]) ?? [];
  const photos = options?.photos as PhotoCalls | undefined;
  const forecasts = [...shuffle(items.filter((q) => !q.id), rng), ...items.filter((q) => q.id)];
  return [
    ...(photos ? photoSteps(photos, rng) : []),
    ...forecasts.map((q): CheckStep => ({
      picture: q.sky || q.profile ? () => forecastPicture(q) : undefined,
      extra: q.instruments ? () => el('ul.readings', {}, ...q.instruments!.map((r) => el('li', {}, r))) : undefined,
      ask: q.question,
      choices: q.options,
      answer: q.answer,
      why: q.why,
    })),
  ];
});
