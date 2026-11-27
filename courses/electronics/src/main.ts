// First, so edited course text (Settings) is in place before anything reads it.
import { COURSE } from './course';
import './app/styles/app.css';
import { defineCourse } from 'didactics/app';
import encyclopedia from 'virtual:didactics/encyclopedia';
import { glossaryFromFile, type GlossaryFile } from 'didactics/glossary';
import glossary from './data/glossary.json';
import { el } from 'didactics/dom';
import { SITE_URL } from './app/asset';
import { DECK } from './app/deck';
import { FIGURES } from './app/figures';
import { prose } from './app/figures/kit';
import { empty, store } from './store';
import { creditsView } from './app/views/credits';
import { homeView } from './app/views/home';
import { lessonOptions } from './app/views/lesson';
import { referenceView } from './app/views/reference';
import { LESSONS } from './core/lessons';
import type { CourseRelease } from 'didactics/release';
import course from '../course.json';

// The whole app (Didactics' app.ts): the top bar and its menu, the lesson
// player, the quiz, Settings, the update banner. The save is "circuitry.save",
// the course's edited text "circuitry.course", and the files
// circuitry-save.json, circuitry-course.json and circuitry.html. What is
// Circuitry's own is passed in: the home page with its tracks, the reference
// page (symbols and glossary included) and Credits.
defineCourse({
  release: course.release as CourseRelease,
  id: 'circuitry',
  title: 'Circuitry',
  subtitle: 'A circuits workbook',
  site: SITE_URL,
  update: { title: 'New revision', text: 'A new version of Circuitry is ready.' },

  lessons: LESSONS,
  figures: FIGURES,
  prose,
  lesson: lessonOptions,
  // Circuitry's save (store.ts): metric only, no radio, under "circuitry.save".
  save: { store, empty },
  text: COURSE,
  // A lesson's downloadable piece: its file and the words in the code of its figures.
  textPieces: { modules: import.meta.glob('/src/app/figures/*.ts', { eager: true }), files: (l) => [`src/data/lessons/${l.id}.json`] },

  // The board over the lessons by track (core, then pedals and solar), and the way to the reference.
  home: homeView,
  pages: [
    { path: '/reference', label: 'Reference', view: referenceView },
    // Circuitry has no photos, so not Didactics' photo Credits page.
    { path: '/credits', view: creditsView },
  ],
  menu: ['/home', '/reference', '/review', '/settings'],
  // The site's catalog of every course, one folder up.
  catalog: { href: '../' },
  // The site's encyclopedia, with the reference page's glossary among this course's terms.
  encyclopedia: { data: encyclopedia, course: 'electronics', terms: glossaryFromFile(glossary as GlossaryFile) },
  quiz: {
    deck: DECK,
    blurb: 'Flash cards on the ideas in the lessons. Cards you get right come back after longer and longer gaps; cards you miss come back soon.',
  },
  settings: {
    about: el('p', {}, el('a', { href: '#/credits' }, 'Credits'), ': type and sources.'),
  },
});
