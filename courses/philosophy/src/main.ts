import 'didactics/styles/kit.css';
import './styles/tokens.css';
import { courseFiles } from 'didactics/course';
import { defineCourse } from 'didactics/app';
import { el } from 'didactics/dom';
import { SITE_URL } from './asset';
import { FIGURES } from './figures';
import { prose } from './figures/kit';
import { BRANCHES, LESSONS, TRUNK } from './lessons';
import { PHOTOS } from './photos';
import { emptySave, store } from './store';
import { verdictsView } from './verdicts-page';
import type { CourseRelease } from 'didactics/release';
import course from '../course.json';

defineCourse({
  release: course.release as CourseRelease,
  id: 'philosophy',
  title: 'Philosophy',
  subtitle: "What was Plato's Gig?",
  mark: el('img', { src: 'icons/icon.svg', alt: '' }),
  site: SITE_URL,
  lessons: LESSONS,
  branches: BRANCHES,
  welcome: el('div', {},
    el('p', {}, 'In 399 BC Socrates told the Athenian jury that his job was to be the city\'s gadfly, and Athens put him to death for it. The lessons follow the questions he started, in the order people asked them, from Plato\'s cave to whether a chatbot could feel pain. Each lesson opens on a real scene and asks for your verdict before it gives the argument, then the strongest objection, and often where the idea stands among philosophers today.'),
    el('p', {}, 'Your verdicts are kept on the Verdicts page, beside how professional philosophers answered the same questions in 2020, with any of your answers that pull against each other. Branches go outside Europe, into politics, and into the puzzles and tools of the trade.')),
  figures: FIGURES,
  prose,
  // "Lesson 3 of 25": the trunk's whole plan.
  lesson: { of: () => TRUNK },
  save: { store, empty: emptySave },
  pages: [{ path: '/verdicts', label: 'Verdicts', view: verdictsView }],
  photos: {
    photos: PHOTOS,
    name: (p) => p.about,
  },
  settings: {
    about: el('p', {}, el('a', { href: '#/credits' }, 'Credits'), ': who made the pictures.'),
  },
  catalog: { href: '../' },
  offline: { noun: 'photos' },
  text: {
    files: courseFiles(import.meta.glob('/src/lessons/*.json', { eager: true, import: 'default' })),
    code: () => import('virtual:didactics/code-text').then((m) => m.default),
  },
});
