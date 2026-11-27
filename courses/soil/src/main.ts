// First, so edited course text (Settings) is in place before anything reads it.
import './course';
import './app/styles/app.css';
import { defineCourse } from 'didactics/app';
import { el } from 'didactics/dom';
import { COURSE } from './course';
import { LESSONS } from './core/lessons';
import { SUBJECTS } from './core/photos';
import { SITE_URL } from './app/asset';
import { DECK } from './app/deck';
import { FIGURES } from './app/figures';
import { prose } from './app/figures/kit';
import { PHOTOS } from './app/picture';
import { makeGarden } from './app/scene/garden';
import { empty, store } from './store';
import { homeView } from './app/views/home';
import { referenceView } from './app/views/reference';
import type { CourseRelease } from 'didactics/release';
import course from '../course.json';

// The whole app (Didactics' app.ts): the save is "dirt.save", the course's
// edited text "dirt.course", and the files dirt-save.json, dirt-course.json
// and dirt.html.
defineCourse({
  release: course.release as CourseRelease,
  id: 'dirt',
  title: 'Dirt',
  subtitle: 'A soil workbook',
  // The course's icon (catalog/icons, `npm run icons` at the root) as the header's logo mark.
  mark: el('img', { src: 'icons/icon.svg', alt: '' }),
  lessons: LESSONS,
  figures: FIGURES,
  prose,
  // Each lesson opens under Dirt's garden.
  lesson: { hero: (l) => makeGarden({ seed: 30 + l.n, time: l.n % 2 ? 'morning' : 'noon' }) },
  // Dirt's save (store.ts): in inches and feet to start, under "dirt.save".
  save: { store, empty },
  // The garden in the morning over the lesson board, and the way to the reference.
  home: homeView,
  // The glossary is a section of the reference page.
  pages: [{ path: '/reference', label: 'Reference', view: referenceView }],
  menu: ['/home', '/reference', '/review', '/settings'],
  // The site's catalog of every course, one folder up.
  catalog: { href: '../' },
  quiz: {
    deck: DECK,
    blurb: 'Flash cards on the ideas in the lessons. Cards you get right come back after longer and longer gaps; cards you miss come back soon.',
  },
  photos: {
    photos: PHOTOS,
    name: (p) => SUBJECTS[p.subject],
    intro: el('p', {}, 'Particle sizes and texture classes follow the USDA Soil Survey Manual. The drawings of the garden and the soils are made for this app.'),
    empty: 'No photos have been fetched yet; drawings stand in for them until they are.',
    after: [
      el('h2', {}, 'Type'),
      el('p', {}, 'Fraunces by Undercase Type and Nunito Sans by Vernon Adams, Jacques Le Bailly and Manvel Shmavonyan, all under the SIL Open Font License.'),
      el('p.muted', {}, `Version ${__APP_VERSION__}`),
    ],
  },
  text: COURSE,
  // A lesson's downloadable piece: its file and the words in the code of its
  // figures, with the src/core model each draws on (soil.ts behind made-of.ts).
  textPieces: {
    modules: import.meta.glob('/src/app/figures/*.ts', { eager: true }),
    files: (l) => [`src/data/lessons/${l.id}.json`],
    alongside: (file) => {
      const name = file.replace(/^src\/app\/figures\/(.*)\.ts$/, '$1');
      return [`src/core/${({ 'made-of': 'soil', photo: 'photos' } as Record<string, string>)[name] ?? name}.ts`];
    },
  },
  settings: {
    units: { label: 'Measure in', imperial: 'Inches and feet', metric: 'Centimetres and metres' },
    about: el('p', {}, el('a', { href: '#/credits' }, 'Credits'), ': who took the photos, and under what licence.'),
  },
  site: SITE_URL,
  update: { title: 'Fresh growth', text: 'A new version of Dirt is ready.' },
  // Earlier versions kept each photo once seen, in a cache of their own; the
  // service worker now downloads them all, so that cache goes once it has.
  offline: { noun: 'photos', retire: ['photos'] },
});
