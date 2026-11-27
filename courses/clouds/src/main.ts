// First, so edited course text (Settings) is in place before anything reads it.
import { COURSE } from './course';
import './app/styles/app.css';
import { defineCourse } from 'didactics/app';
import { el } from 'didactics/dom';
import encyclopedia from 'virtual:didactics/encyclopedia';
import { makeRng } from 'didactics/rng';
import { genus } from './core/clouds';
import { mirrorFor } from './core/photos';
import { buildDeck } from './core/quiz';
import { LESSONS } from './core/lessons';
import { asset, SITE_URL } from './app/asset';
import { FIGURES } from './app/figures';
import { prose } from './app/figures/kit';
import { photoFigure, PHOTOS } from './app/photos';
import { store } from './app/store';
import { emptySave } from './core/save';
import { homeView } from './app/views/home';
import { guideView, journalRedirect } from './app/views/guide';
import { seedView } from './app/views/seed';
import { lessonOptions } from './app/views/lesson';
import { skyView } from './app/views/sky';
import type { CourseRelease } from 'didactics/release';
import course from '../course.json';

// The app is Didactics' (didactics/app): the top bar and its menu, the lesson
// player, the quiz, Credits, Settings, the update banner. What is Clouds' own
// is passed in: the home page, the sky lab, the seeding game and the field guide.
defineCourse({
  release: course.release as CourseRelease,
  id: 'clouds',
  title: 'Clouds',
  subtitle: 'What are they up to?',
  site: SITE_URL,
  splash: { src: asset('poster.webp'), alt: 'Clouds: What are they up to?' },
  update: { title: 'New forecast in', text: 'A fresh version of Clouds is ready.' },

  lessons: LESSONS,
  figures: FIGURES,
  prose,
  lesson: lessonOptions,
  save: { store, empty: emptySave },
  text: COURSE,
  // A lesson's downloadable piece: its file, and the words in
  // the code of its figures and the src/core model of the same name.
  textPieces: {
    modules: import.meta.glob('/src/app/figures/*.ts', { eager: true }),
    files: (l) => [`src/data/lessons/${l.id}.json`],
    alongside: (file) => [file.replace('src/app/figures/', 'src/core/')],
  },

  home: homeView,
  pages: [
    { path: '/sky', label: 'Sky lab', view: skyView },
    { path: '/seed', view: seedView },
    { path: '/guide', label: 'Field guide', view: guideView },
    { path: '/guide/:tab', view: guideView },
    // Every other course's field guide is at /field-guide; here it is the guide's Lessons tab.
    { path: '/field-guide', view: (_root, nav) => nav.replace('/guide/lessons') },
    // Addresses from before 2026-11: lessons were "shifts", the guide the journal.
    { path: '/shift/:id', view: (_root, nav) => nav.replace(`/lesson/${nav.params.id}`) },
    { path: '/journal', view: journalRedirect },
    { path: '/journal/:tab', view: journalRedirect },
  ],
  // The pages sit in a menu under the current page's name, so more can join without crowding the bar.
  menu: ['/home', '/sky', '/review', '/guide', '/settings'],
  // The site's catalog of every course, one folder up.
  catalog: { href: '../' },
  encyclopedia: { data: encyclopedia, course: 'clouds' },
  // The field guide is a tab of Clouds' own (views/guide.ts), not a page of its own.
  fieldGuide: false,

  quiz: {
    // The same wrong answers every time a card comes up, so a card is a card.
    deck: buildDeck(PHOTOS, makeRng(1931)),
    blurb: 'Flash cards on real photos, on what makes each cloud and what it means, and on the ideas behind the lessons. Cards you get right come back after longer and longer gaps; cards you miss come back soon.',
    media: (card) => (card.photo ? photoFigure(card.photo, 'A cloud to name', mirrorFor(card.photo, Math.random)) : null),
  },
  photos: {
    photos: PHOTOS,
    name: (p) => genus(p.genus).name,
    intro: el('p', {}, 'Cloud names, heights and classification follow the WMO International Cloud Atlas. The drawn clouds and landscapes are made for this app.'),
    empty: 'No photos have been fetched yet; the lessons use drawings until they are.',
    after: [
      el('h2', {}, 'Type'),
      el('p', {}, 'Oswald by Vernon Adams and Nunito Sans by Vernon Adams, Jacques Le Bailly and Manvel Shmavonyan, both under the SIL Open Font License.'),
      el('p.muted', {}, `Version ${__APP_VERSION__}`),
    ],
  },
  // Before 2026-10-26 each photo was kept in a cache of its own once seen.
  offline: { noun: 'photos', retire: ['photos'] },
  settings: {
    units: { label: 'Heights in', imperial: 'Feet', metric: 'Metres' },
    oneFile: { href: asset('clouds.html'), name: 'clouds.html', offline: { href: asset('clouds-offline.html'), name: 'clouds-offline.html' } },
    about: el('p', {}, el('a', { href: '#/credits' }, 'Credits'), ': who took the photos, and under what licence.'),
  },
});
