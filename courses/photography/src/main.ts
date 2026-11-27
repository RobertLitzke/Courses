// First: the edited words go in before any module reads them.
import { COURSE, LESSON_PIECES } from './course';
import './app/styles/app.css';
import { defineCourse } from 'didactics/app';
import encyclopedia from 'virtual:didactics/encyclopedia';
import { glossaryFromFile, type GlossaryFile } from 'didactics/glossary';
import glossary from './data/glossary.json';
import { el } from 'didactics/dom';
import { SITE_URL } from './app/asset';
import { CREDITS } from './app/credits';
import { DECK } from './app/deck';
import { FIGURES } from './app/figures';
import { prose } from './app/figures/kit';
import { makeScene } from './app/scene/field';
import { empty, store } from './store';
import { homeView } from './app/views/home';
import { referenceView } from './app/views/reference';
import { LESSONS } from './core/lessons';
import type { CourseRelease } from 'didactics/release';
import course from '../course.json';

// The whole app (Didactics' app.ts). The save stays under "outofauto.save"
// (store.ts) and the edited text under "out-of-auto.course" (course.ts), as
// before the course joined the site; the files are out-of-auto-save.json,
// out-of-auto-course.json and out-of-auto.html.
defineCourse({
  release: course.release as CourseRelease,
  id: 'out-of-auto',
  title: 'Photography',
  subtitle: 'Out of Auto',
  // The course's icon (catalog/icons, `npm run icons` at the root) as the header's logo mark.
  mark: el('img', { src: 'icons/icon.svg', alt: '' }),
  site: SITE_URL,
  update: { title: 'New version', text: 'A fresh version of Photography: Out of Auto is ready.' },

  lessons: LESSONS,
  figures: FIGURES,
  prose,
  lesson: {
    // "Lesson 1 of 12": the whole plan, which the home page shows too.
    countComing: true,
    hero: (l) => makeScene({ seed: 30 + l.n, time: l.n % 2 ? 'morning' : 'evening' }),
  },
  // The save stays under "outofauto.save" (store.ts), as before the course joined the site.
  save: { store, empty },
  text: COURSE,
  textPieces: LESSON_PIECES,

  home: homeView,
  pages: [{ path: '/reference', label: 'Reference', view: referenceView }],
  menu: ['/home', '/reference', '/review', '/settings'],
  // The site's catalog of every course, one folder up.
  catalog: { href: '../' },
  // The site's encyclopedia, with the reference page's glossary among this course's terms.
  encyclopedia: { data: encyclopedia, course: 'photography', terms: glossaryFromFile(glossary as GlossaryFile) },
  offline: { noun: 'photos' },
  quiz: {
    deck: DECK,
    blurb: 'Flash cards on the ideas in the lessons. Cards you get right come back after longer and longer gaps; cards you miss come back soon.',
  },
  photos: CREDITS,
  settings: {
    units: { label: 'Distances in', imperial: 'Feet', metric: 'Metres' },
    about: el('p', {}, el('a', { href: '#/credits' }, 'Credits'), ': who took the photographs, and under what licence.'),
  },
});
