// The field guide, in three tabs. Clouds: the ten kinds and the rare sights,
// as photos to tap for their card. Lessons: the summary of every lesson done,
// growing as the reader goes, to print (Didactics' field guide, which other
// courses have as a page of its own). Glossary: every term the lessons use, A
// to Z (core/glossary.ts). (Until 2026-11-27 a Radio tab held the transcripts of
// the radio talks, now removed. Until 2026-11 this was the journal, with a Notes tab of lines each
// finished lesson unlocked; the lesson summaries say the same now.)

import { GENERA, floorInfo, genus, type Genus, type GenusId } from '../../core/clouds';
import { GLOSSARY, lessonOf } from '../../core/glossary';
import { BRANCHES, LESSONS, lessonName, lessonById } from '../../core/lessons';
import { FEATURES, photoFile, photosOf, photosOfFeature, type FeatureId, type Photo } from '../../core/photos';
import { el, svg, type Child } from 'didactics/dom';
import { fieldGuideBody } from 'didactics/field-guide';
import { glossaryView } from 'didactics/glossary';
import type { View } from 'didactics/router';
import { sheet } from 'didactics/ui';
import { asset } from '../asset';
import { FIGURES } from '../figures';
import { store } from '../store';
import { prose } from '../figures/kit';
import { photoFigure, PHOTOS } from '../photos';
import { drawCloud } from '../scene/drawn';
import { PALETTES } from '../scene/landscape';

type Tab = 'clouds' | 'lessons' | 'glossary';

const FLOORS: readonly { floor: Genus['floor']; title: string }[] = [
  { floor: 'low', title: 'Low floor' },
  { floor: 'middle', title: 'Middle floor' },
  { floor: 'high', title: 'High floor' },
  { floor: 'tower', title: 'All three floors' },
];

/** The rare sights: their card, and the lesson that points them out. */
const RARE: readonly { id: FeatureId; name: string; sub: string; title: string; text: string; lesson: string }[] = [
  {
    id: 'lenticularis', name: 'Lens cloud', sub: 'Lenticularis', title: 'Lens cloud (lenticularis)', lesson: 'local-sky',
    text: 'A smooth, almond- or lens-shaped cloud hovering motionless in the crest of a standing mountain wave downwind of a ridge. Moist air condenses as it rises into the wave crest and evaporates as it sinks out the downwind edge, keeping the cloud stationary while strong winds blow right through it.',
  },
  {
    id: 'fluctus', name: 'Breaking waves', sub: 'Fluctus', title: 'Kelvin-Helmholtz waves (fluctus)', lesson: 'local-sky',
    text: 'Trains of curling, breaking-surf billows along the top of a cloud layer (Kelvin–Helmholtz waves), formed where a fast airstream slides over a slower, denser cloud layer below. They dissolve within a minute or two as they mix the layers together, serving as a visual warning of strong wind shear and turbulence.',
  },
  {
    id: 'mammatus', name: 'Mammatus', sub: 'Under an anvil', title: 'Mammatus', lesson: 'giants',
    text: 'Smooth, rounded pouches hanging beneath a thunderstorm anvil, formed where pockets of ice- and droplet-laden air sink into drier air below. Evaporating particles chill the sinking pockets so they warm at only ~5 °C/km on the way down, staying colder and denser than their surroundings in upside-down convection. Though dramatic when lit by low sun, mammatus pouches themselves are harmless.',
  },
];

export const guideView: View = (root, nav) => {
  const tabs: [Tab, string][] = [['clouds', 'Clouds'], ['lessons', 'Lessons'], ['glossary', 'Glossary']];
  const tab = (tabs.find(([t]) => t === nav.params.tab)?.[0] ?? 'clouds') as Tab;

  const lessons = tab === 'lessons' ? fieldGuideBody({ title: 'Clouds', lessons: LESSONS, branches: BRANCHES, store, prose, figures: FIGURES, heading: false }) : null;
  const body =
    lessons ? lessons.node : tab === 'glossary' ? glossaryTab() : cloudsTab();

  root.append(
    el('div.page.guide', {},
      el('h1', {}, 'Field guide'),
      el('nav.seg.guide-tabs', { 'aria-label': 'Field guide sections' },
        tabs.map(([t, label]) => el('a', { href: t === 'clouds' ? '#/guide' : `#/guide/${t}`, className: t === tab ? 'on' : undefined, 'aria-current': t === tab ? 'page' : undefined }, label))),
      body,
    ),
  );
  return lessons?.close;
};

/** The old journal's addresses open the guide. */
export const journalRedirect: View = (_root, nav) => {
  nav.replace(nav.params.tab ? `/guide/${nav.params.tab}` : '/guide');
};

// ---- Clouds ---------------------------------------------------------------

function cloudsTab(): HTMLElement {
  const tile = (name: string, sub: string, photo: Photo | undefined, art: () => Child, open: () => void) =>
    el('button.cloud-tile', { type: 'button', onclick: open },
      photo ? el('img', { src: asset(photoFile(photo)), alt: '', loading: 'lazy', decoding: 'async' }) : el('div.tile-art', {}, art()),
      el('span.tile-name', {}, name),
      el('span.tile-sub', {}, sub));

  return el('div', {},
    el('p.muted.guide-lede', {}, 'The ten kinds of cloud, by the floor they live on, and a few rare sights. Tap one for its card.'),
    FLOORS.map(({ floor, title }) => {
      const here = GENERA.filter((g) => g.floor === floor);
      return el('section.cloud-floor', {},
        el('h2', {}, title),
        el('div.cloud-tiles', {}, here.map((g) => tile(g.name, g.abbr, photosOf(PHOTOS, g.id)[0], () => cloudArt(g.id), () => openCloud(g.id)))));
    }),
    el('section.cloud-floor', {},
      el('h2', {}, 'Rare sights'),
      el('div.cloud-tiles', {}, RARE.map((r) => tile(r.name, r.sub, photosOfFeature(PHOTOS, r.id)[0], () => null, () => openRare(r.id))))),
  );
}

function cloudArt(id: GenusId): SVGElement {
  const tall = genus(id).floor === 'tower';
  return svg('svg', { viewBox: tall ? '-80 -150 160 185' : '-90 -40 180 70' }, drawCloud(id, PALETTES.day, 2));
}

/** A link to the lesson that teaches something. */
function lessonLink(id: string | undefined): HTMLElement | null {
  const s = id ? lessonById(id) : undefined;
  if (!s) return null;
  return el('a.sheet-lesson', { href: `#/lesson/${s.id}` }, `${lessonName(s)}: ${s.title} ›`);
}

function openCloud(id: GenusId): void {
  const g = genus(id);
  const photo = photosOf(PHOTOS, id)[0];
  sheet(g.name,
    photo ? photoFigure(photo, g.name) : el('div.sheet-art', {}, cloudArt(id)),
    el('div.sheet-text', {},
      el('p.sheet-floor', {}, g.floor === 'tower' ? 'All three floors' : `${floorInfo(g.floor).name} floor`),
      el('h2', {}, g.name, el('span.abbr', {}, g.abbr)),
      el('dl.cloud-facts', {},
        el('dt', {}, 'Looks like'), el('dd', {}, g.look),
        el('dt', {}, 'Made by'), el('dd', {}, g.made),
        el('dt', {}, 'Means'), el('dd', {}, g.means),
        el('dt', {}, 'Often taken for'), el('dd', {}, g.confused.map((c) => genus(c).name).join(', '))),
      lessonLink(lessonOf(id)?.id),
    ),
  );
}

function openRare(id: FeatureId): void {
  const r = RARE.find((x) => x.id === id);
  const photo = photosOfFeature(PHOTOS, id)[0];
  sheet(r?.title ?? id,
    photo ? photoFigure(photo, r?.title ?? id) : null,
    el('div.sheet-text', {},
      el('p.sheet-floor', {}, 'Rare sight'),
      el('h2', {}, r?.title ?? id),
      r ? el('p', {}, r.text) : null,
      lessonLink(r?.lesson),
    ),
  );
}

// ---- Glossary -------------------------------------------------------------

function glossaryTab(): HTMLElement {
  const clouds = new Set<string>(GENERA.map((g) => g.id));
  const rare = new Set<string>(FEATURES);
  const entries = GLOSSARY.map((e) =>
    clouds.has(e.id) ? { ...e, open: () => openCloud(e.id as GenusId) }
    : rare.has(e.id) ? { ...e, open: () => openRare(e.id as FeatureId) }
    : e);
  return el('div', {},
    el('p.muted.guide-lede', {},
      'Every term the lessons use. ',
      el('span.gl-dot.fn-technical', { 'aria-hidden': 'true' }),
      ' marks a technical note from a lesson; a name with an arrow opens its card.'),
    glossaryView({
      entries,
      prose,
      lesson: (id) => {
        const s = lessonById(id);
        return s && { href: `#/lesson/${s.id}`, label: lessonName(s) };
      },
    }),
  );
}
