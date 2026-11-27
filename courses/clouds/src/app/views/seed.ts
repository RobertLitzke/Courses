// The cloud seeding game. Pick an order from the list, set up the air (or take
// the day's air as given), and watch which cloud forms over Harrow and what
// falls from it; then fly a seeding run through it and see what changes. The
// sky is core/seeding.ts; this file draws it and holds the controls.

import { ORDERS, type Order } from '../../core/orders';
import { DEFAULT_SETUP, DOSE, STRENGTH, formCloud, headline, levelOf, seed, type Agent, type Cooling, type Setup, type Sky } from '../../core/seeding';
import { makeRng } from 'didactics/rng';
import { el, svg } from 'didactics/dom';
import { slider, type Slider } from '../figures/kit';
import type { View } from 'didactics/router';
import { placeCloud } from '../scene/drawn';
import { FLOOR_BANDS, H, HORIZON, W, makeScene, type Palette, type Scene } from '../scene/landscape';
import { getSave, updateSave } from '../store';
import { segmented, toast } from 'didactics/ui';

/** Heights to scene y, by floor, as the lesson scenes stack them: not to scale. */
const STOPS: [number, number][] = [[0, HORIZON], [2000, FLOOR_BANDS.low.top], [6000, FLOOR_BANDS.high.bottom], [12000, FLOOR_BANDS.high.top]];
function yOf(m: number): number {
  if (m <= 0) return HORIZON;
  for (let i = 1; i < STOPS.length; i++) {
    const [m0, y0] = STOPS[i - 1];
    const [m1, y1] = STOPS[i];
    if (m <= m1) return y0 + ((m - m0) / (m1 - m0)) * (y1 - y0);
  }
  return STOPS[STOPS.length - 1][1];
}

/** Where rain or snow lands: the near swell, by the town. */
const GROUND_Y = 226;

const COOLINGS: readonly { value: Cooling; label: string }[] = [
  { value: 'night', label: 'Night' },
  { value: 'sun', label: 'Sun' },
  { value: 'hills', label: 'Ridge' },
  { value: 'front', label: 'Front' },
];
const AGENTS: readonly { value: Agent; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'dryIce', label: 'Dry ice' },
  { value: 'silverIodide', label: 'Silver iodide' },
];
const DEFAULT_STRENGTH: Record<Cooling, number> = { night: 8, sun: 10, hills: 2000, front: 3000 };
const DEFAULT_DOSE: Record<Exclude<Agent, 'none'>, number> = { dryIce: 2, silverIodide: 10 };

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export const seedView: View = (root) => {
  let current: Order | null = null;
  let setup: Setup = { ...DEFAULT_SETUP };
  /** The seeding run has flown over the sky as it is now. */
  let flown = false;
  let flying = 0;
  let alive = true;

  const page = el('div.page.seed');
  root.append(page);

  // ---- The order board ----------------------------------------------------

  const board = el('div.order-board');
  const paintBoard = () => {
    const done = new Set(getSave().orders);
    board.replaceChildren(
      ...ORDERS.map((o) =>
        el('button.order', {
          type: 'button',
          className: `order${done.has(o.id) ? ' done' : ''}${current?.id === o.id ? ' on' : ''}`,
          onclick: () => pick(o),
        }, el('span.tick'), el('span', {}, o.title), o.fixed ? el('span.order-kind', {}, 'Seed') : null),
      ),
      el('button.order', { type: 'button', className: `order free${current ? '' : ' on'}`, onclick: () => pick(null) }, el('span', {}, 'Free sky')),
    );
  };

  // ---- The sky --------------------------------------------------------------

  const card = el('div.fig.seed-lab');
  const task = el('p.fig-task');
  const ask = el('div.seed-ask');
  const sceneBox = el('div.fig-scene');
  const lead = el('p.fig-lead');
  const readout = el('p.fig-readout');
  readout.style.setProperty('--lines', '9');
  const airBox = el('div.seed-group');
  const runBox = el('div.seed-group');
  card.append(task, ask, el('div.fig-body', {}, sceneBox, el('div.fig-text', {}, lead, readout), el('div.fig-controls', {}, airBox, runBox)));

  let scene: Scene | null = null;
  let palette: Palette;
  let layer: SVGElement;
  let plane: SVGElement;
  let sceneCooling: Cooling | null = null;

  const makeSky = () => {
    if (scene && sceneCooling === setup.cooling) return;
    sceneCooling = setup.cooling;
    scene = makeScene({ time: setup.cooling === 'night' ? 'dawn' : 'dusk', seed: 46, sun: [0.8, 0.6] });
    palette = scene.palette;
    layer = svg('g', { class: 'seed-sky' });
    scene.sky.append(layer);
    plane = svg('g', { class: 'seed-plane' });
    scene.front.append(plane);
    sceneBox.replaceChildren(scene.root);
  };

  const sky = (): Sky => (flown ? seed(setup) : formCloud(setup));

  const paint = () => {
    makeSky();
    const s = sky();
    drawSky(layer, scene!, palette, s, setup);
    lead.textContent = headline(s, setup.cooling);
    // Seeded, the run's part of the story gets a paragraph of its own.
    const split = flown ? formCloud(setup).why.length : s.why.length;
    readout.replaceChildren(s.why.slice(0, split).join(' '), ...(split < s.why.length ? [el('br'), el('br'), s.why.slice(split).join(' ')] : []));
    const met = current?.met(s) ?? false;
    card.classList.toggle('done', met);
    if (met && current && !getSave().orders.includes(current.id)) {
      updateSave((sv) => ({ ...sv, orders: [...sv.orders, current!.id] }));
      toast(`Order filled: ${current.title}.`);
      paintBoard();
    }
  };

  /** The air changed: the seeding run is undone, and the sky redrawn. */
  const changed = () => {
    flown = false;
    cancelAnimationFrame(flying);
    plane.replaceChildren();
    paint();
  };

  // ---- The controls ---------------------------------------------------------

  const fixedNote = (text: string) => el('p.seed-fixed', {}, text);
  const C = (v: number) => `${v} °C`;

  const buildControls = () => {
    const fixed = current?.fixed ?? {};
    const locked = (k: keyof Setup) => k in fixed;
    const add = (s: Slider, k: keyof Setup) => {
      if (locked(k)) s.input.disabled = true;
      return s.node;
    };

    const strengthSlider = () => {
      const r = STRENGTH[setup.cooling];
      const show = (v: number) => (r.unit === 'C' ? `${v} °C` : `${(v / 1000).toFixed(1)} km`);
      return add(slider(r.label, r.min, r.max, r.step, setup.strength, show, (v) => { setup.strength = v; changed(); }, 'parcel'), 'strength');
    };
    const strengthBox = el('div', {}, strengthSlider());

    const cooling = locked('cooling')
      ? fixedNote(`Cooled by: ${COOLINGS.find((c) => c.value === setup.cooling)!.label.toLowerCase()}`)
      : segmented(COOLINGS, setup.cooling, (c) => {
          setup.cooling = c;
          setup.strength = DEFAULT_STRENGTH[c];
          strengthBox.replaceChildren(strengthSlider());
          changed();
        });

    airBox.replaceChildren(
      el('h3', {}, current?.fixed ? 'Today’s air' : 'The air'),
      ...(current?.fixed ? [fixedNote('Given: you can’t change the weather, only seed it.')] : []),
      el('div.seed-row', {}, el('span.seed-label', {}, 'What cools it'), cooling),
      add(slider('Temperature', -15, 35, 1, setup.groundC, C, (v) => { setup.groundC = v; changed(); }, 'warm'), 'groundC'),
      add(slider('Dew point', -30, 30, 1, setup.dewC, C, (v) => { setup.dewC = v; changed(); }, 'dew'), 'dewC'),
      add(slider('Cooling with height', 4, 9.5, 0.5, setup.lapsePerKm, (v) => `${v} °C per km · ${v <= 5.5 ? 'stable' : v >= 7.5 ? 'unstable' : 'middling'}`, (v) => { setup.lapsePerKm = v; changed(); }, 'env'), 'lapsePerKm'),
      strengthBox,
    );

    const doseBox = el('div');
    const doseSlider = () => {
      if (setup.agent === 'none') return el('p.seed-fixed', {}, 'Pick an agent to load the plane.');
      const d = DOSE[setup.agent];
      return slider(d.label, d.min, d.max, d.step, setup.dose, (v) => `${v} ${d.unit}`, (v) => { setup.dose = v; if (flown) changed(); }, 'ice').node;
    };
    doseBox.append(doseSlider());
    const fly = el('button.btn', { type: 'button', onclick: () => run() }, 'Fly the seeding run');
    runBox.replaceChildren(
      el('h3', {}, 'The seeding run'),
      el('div.seed-row', {}, el('span.seed-label', {}, 'Load'), segmented(AGENTS, setup.agent, (a) => {
        setup.agent = a;
        setup.dose = a === 'none' ? 0 : DEFAULT_DOSE[a];
        doseBox.replaceChildren(doseSlider());
        if (flown) changed();
      })),
      doseBox,
      fly,
    );
  };

  // ---- The seeding run --------------------------------------------------------

  const run = () => {
    if (setup.agent === 'none' || setup.dose <= 0) {
      toast('Load the plane first: dry ice or silver iodide.');
      return;
    }
    flown = false;
    paint();
    const before = formCloud(setup);
    const y = before.made === 'clear' ? yOf(2500) : Math.max(14, yOf(before.topM) - 4);
    const smoke = setup.agent === 'silverIodide';
    const dots: { x: number; y: number; v: number }[] = [];
    const trail = svg('polyline', { fill: 'none', stroke: 'rgba(240, 236, 250, 0.6)', 'stroke-width': 2, 'stroke-linecap': 'round' });
    const pellets = svg('g');
    const craft = duster(palette.near);
    plane.replaceChildren(trail, pellets, craft);
    const trailPts: string[] = [];
    const finish = () => {
      plane.replaceChildren();
      flown = true;
      layer.classList.add('fade');
      paint();
      setTimeout(() => layer.classList.remove('fade'), 600);
    };
    if (reduced()) return finish();
    const t0 = performance.now();
    const dur = 2600;
    let last = t0;
    const tick = (now: number) => {
      if (!alive) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const k = Math.min(1, (now - t0) / dur);
      const x = -30 + k * (W + 60);
      craft.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
      if (x > 20 && x < W - 20) {
        if (smoke) trailPts.push(`${(x - 10).toFixed(1)},${(y + 1).toFixed(1)}`);
        else if (Math.random() < dt * 30) dots.push({ x: x - 4, y: y + 2, v: 10 + Math.random() * 20 });
      }
      trail.setAttribute('points', trailPts.join(' '));
      for (const d of dots) {
        d.y += d.v * dt;
      }
      pellets.replaceChildren(...dots.map((d) => svg('circle', { cx: d.x.toFixed(1), cy: d.y.toFixed(1), r: 0.9, fill: '#fff' })));
      if (k < 1) flying = requestAnimationFrame(tick);
      else finish();
    };
    flying = requestAnimationFrame(tick);
  };

  // ---- Orders -------------------------------------------------------------

  const pick = (o: Order | null) => {
    current = o;
    setup = { ...DEFAULT_SETUP, ...(o?.fixed ?? {}) };
    flown = false;
    cancelAnimationFrame(flying);
    task.replaceChildren(el('span.tick'), o ? o.title : 'Free sky: make anything');
    ask.replaceChildren(
      ...(o
        ? [
            el('p.seed-plain', {}, o.ask),
            el('details.seed-hint', {}, el('summary', {}, 'A hint'), el('p', {}, o.hint)),
          ]
        : [el('p.seed-plain', {}, 'Every slider is yours. Set up the air, cool it, and seed whatever forms.')]),
    );
    sceneCooling = null;
    buildControls();
    paintBoard();
    paint();
  };

  page.append(
    el('p.eyebrow', {}, 'The forecast desk'),
    el('h1', {}, 'Make the sky'),
    el('p.muted', {}, 'Make the skies on the list. Most orders leave the air to you: find a day that would make the sky. The ones marked Seed, for after the cloud-seeding lesson, give you the day as it is, and only the seeding to plan.'),
    board,
    card,
  );
  const firstOpen = ORDERS.find((o) => !getSave().orders.includes(o.id)) ?? null;
  pick(firstOpen);

  return () => {
    alive = false;
    cancelAnimationFrame(flying);
  };
};

// ---- Drawing ---------------------------------------------------------------

/** A war-surplus biplane crop duster, nose to the right, about 18 units long. */
function duster(fill: string): SVGElement {
  return svg('g', {},
    svg('polygon', { points: '-9,0 6,-1.5 9,0 6,1.5 -9,1', fill }),
    svg('polygon', { points: '-9,0 -11,-4 -8,-1', fill }),
    svg('rect', { x: -2, y: -4, width: 7, height: 1.2, fill }),
    svg('rect', { x: -2, y: 2, width: 7, height: 1.2, fill }),
    svg('line', { x1: 0, y1: -3, x2: 0, y2: 2.5, stroke: fill, 'stroke-width': 0.6 }),
    svg('line', { x1: 3.5, y1: -3, x2: 3.5, y2: 2.5, stroke: fill, 'stroke-width': 0.6 }),
  );
}

/** A smooth lens cloud on a wave crest, lit along its top. */
function lens(p: Palette, cx: number, cy: number, w: number, h: number): SVGElement {
  const path = (dy: number, k: number) => `M${cx - w / 2},${cy + dy} Q${cx},${cy - h * k + dy} ${cx + w / 2},${cy + dy} Q${cx},${cy + h * 0.45 * k + dy} ${cx - w / 2},${cy + dy} Z`;
  return svg('g', {},
    svg('path', { d: path(1, 1), fill: p.cloudShade }),
    svg('path', { d: path(-1, 1), fill: p.cloudLight }),
    svg('path', { d: path(0, 0.85), fill: p.cloudMid }),
  );
}

let maskCount = 0;

function drawSky(layer: SVGElement, scene: Scene, p: Palette, s: Sky, setup: Setup): void {
  const rng = makeRng(7);
  const front = scene.front;
  front.querySelectorAll('.seed-front').forEach((n) => n.remove());
  const ahead = svg('g', { class: 'seed-front' });
  front.insertBefore(ahead, front.firstChild);
  const parts: SVGElement[] = [];
  const base = yOf(s.baseM);
  const top = yOf(s.topM);
  const px = Math.max(4, base - top);
  /** Where things fall from: [x, width] for each cloud. */
  let shafts: [number, number][] = [[200, 360]];

  // The freezing and silver iodide levels in the rising air, faintly.
  for (const [c, name, x] of [[0, '0 °C', 4], [-5, '−5 °C', 30]] as const) {
    const h = levelOf(setup, c);
    if (setup.cooling === 'night' || h == null || h < 100 || h > 12000) continue;
    const y = yOf(h);
    parts.push(svg('line', { x1: 0, y1: y, x2: W, y2: y, stroke: '#fff', 'stroke-width': 0.6, 'stroke-dasharray': '2 4', opacity: 0.5 }));
    parts.push(textAt(x, y - 2.5, name, 'start', 0.75));
  }

  const clouds = svg('g');
  switch (s.made) {
    case 'clear':
      shafts = [];
      break;
    case 'fog': {
      // Fog hides the town and the far hills; cleared, a gap opens over the field.
      const depth = 40 + (s.topM / 400) * 50;
      const strips = s.hole ? [[0, 60], [340, 60]] : [[0, W]];
      for (const [x, w] of strips) {
        ahead.append(
          svg('rect', { x, y: GROUND_Y - depth, width: w, height: depth + 40, fill: p.cloudLight, opacity: 0.8 }),
          svg('rect', { x, y: GROUND_Y - depth - 8, width: w, height: 10, fill: p.cloudLight, opacity: 0.4 }),
        );
      }
      if (s.hole) ahead.append(svg('rect', { x: 60, y: GROUND_Y - depth * 0.4, width: 280, height: depth, fill: p.cloudLight, opacity: 0.12 }));
      shafts = s.hole ? [[200, 220]] : [];
      break;
    }
    case 'cumulus': {
      const scale = Math.min(2.4, Math.max(0.45, px / 30));
      const xs = scale > 1.5 ? [110, 290] : scale > 0.9 ? [60, 190, 330] : [40, 130, 215, 300, 370];
      xs.forEach((x, i) => clouds.append(placeCloud('cumulus', p, x, base, scale * (0.85 + 0.3 * rng()), 3 + i)));
      shafts = xs.map((x) => [x, 50 * scale]);
      break;
    }
    case 'cumulonimbus': {
      const scale = Math.max(0.6, px / 135);
      clouds.append(placeCloud('cumulus', p, 50, base, 0.7, 2), placeCloud('cumulonimbus', p, 230, base, scale, 5));
      shafts = [[230, 60 * scale]];
      break;
    }
    case 'stratocumulus':
    case 'altocumulus':
    case 'cirrocumulus':
      if (s.species === 'lenticularis') {
        const h = Math.max(5, Math.min(26, px));
        for (const [x, w] of [[120, 120], [300, 90]]) {
          clouds.append(lens(p, x, base - h * 0.3, w, h));
          if (h > 9) clouds.append(lens(p, x + 4, base - h * 0.85, w * 0.7, h * 0.5));
        }
        shafts = [[120, 110], [300, 80]];
      } else {
        const xs = s.made === 'stratocumulus' ? [30, 150, 270, 390] : [70, 200, 330];
        xs.forEach((x, i) => clouds.append(placeCloud(s.made as 'altocumulus', p, x, base, s.made === 'stratocumulus' ? 1 : 0.8, 4 + i)));
      }
      break;
    default:
      // A sheet across the whole sky; a thick one gets a second, lower layer
      // so its depth shows.
      clouds.append(placeCloud(s.made, p, 0, top + Math.min(26, px), 1, 6));
      if (px > 30 && s.made !== 'cirrostratus') clouds.append(placeCloud(s.made, p, 0, base, 1, 9));
  }

  if (s.veil) {
    // Overseeded: the cloud has turned to a lingering haze of small ice.
    clouds.replaceChildren(placeCloud('cirrostratus', p, 0, base, 1, 3), placeCloud('cirrostratus', p, 0, top + 6, 1, 4));
    if (s.made === 'fog') ahead.replaceChildren(svg('rect', { x: 0, y: GROUND_Y - 40, width: W, height: 80, fill: p.cloudLight, opacity: 0.35 }));
    shafts = [];
  }

  if (s.hole && s.made !== 'fog') {
    // Snowed out along the plane's track: a hole in the layer.
    const id = `seedhole${++maskCount}`;
    const mask = svg('mask', { id }, svg('rect', { x: 0, y: 0, width: W, height: H, fill: '#fff' }), svg('ellipse', { cx: 200, cy: (base + top) / 2, rx: 70, ry: Math.max(14, px), fill: '#000' }));
    parts.push(svg('defs', {}, mask));
    clouds.setAttribute('mask', `url(#${id})`);
    shafts = [[200, 110]];
  }

  parts.push(clouds);
  if (s.made !== 'clear') {
    if (s.made !== 'fog') parts.push(textAt(W - 4, top - 3, `top ${km(s.topM)} · ${deg(s.topC)}`, 'end'));
    if (s.made !== 'fog' && s.baseM > 0) parts.push(textAt(W - 4, base + 9, `base ${km(s.baseM)}`, 'end'));
  }
  layer.replaceChildren(...parts);

  // What falls.
  if (s.fall !== 'none' && shafts.length) {
    const from = s.made === 'fog' ? GROUND_Y - 20 : base + 2;
    const to = s.reaches ? GROUND_Y : from + (GROUND_Y - from) * 0.45;
    const snow = s.fall === 'snow' || s.fall === 'flurries' || (s.fall === 'showers' && setup.groundC <= 2);
    const sparse = s.fall === 'flurries' || s.fall === 'drizzle' ? 0.35 : s.fall === 'thunderstorm' ? 1.6 : 1;
    const fall = svg('g', { class: 'seed-fall', opacity: s.reaches ? 0.85 : 0.6 });
    for (const [cx, w] of shafts) {
      const n = Math.max(3, Math.round((w / 7) * sparse));
      for (let i = 0; i < n; i++) {
        const x = cx - w / 2 + rng() * w;
        const y0 = from + rng() * 6;
        const y1 = to - rng() * (s.reaches ? 4 : (to - from) * 0.4);
        if (snow) {
          for (let y = y0; y < y1; y += 9 + rng() * 6) fall.append(svg('circle', { cx: (x + Math.sin(y / 7) * 1.5).toFixed(1), cy: y.toFixed(1), r: 0.9, fill: p.cloudLight }));
        } else {
          fall.append(svg('line', { x1: x, y1: y0, x2: x - (y1 - y0) * 0.12, y2: y1, stroke: p.cloudLight, 'stroke-width': s.fall === 'drizzle' ? 0.5 : 0.9, 'stroke-dasharray': s.fall === 'drizzle' ? '1.5 3' : '5 3', opacity: 0.8 }));
        }
      }
    }
    if (s.fall === 'thunderstorm') {
      const [cx] = shafts[0];
      fall.append(svg('polyline', { points: `${cx + 10},${from} ${cx + 2},${from + 14} ${cx + 9},${from + 14} ${cx - 2},${GROUND_Y - 4}`, fill: 'none', stroke: '#fff6c8', 'stroke-width': 1.4, 'stroke-linejoin': 'round' }));
    }
    ahead.append(fall);
  }
}

function textAt(x: number, y: number, text: string, anchor: 'start' | 'end', opacity = 0.95): SVGElement {
  const t = svg('text', { x, y, 'text-anchor': anchor, class: 'seed-tag', opacity });
  t.textContent = text;
  return t;
}

const km = (m: number) => (m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m / 10) * 10} m`);
const deg = (c: number) => `${c < 0 ? '−' : ''}${Math.abs(Math.round(c))} °C`;

