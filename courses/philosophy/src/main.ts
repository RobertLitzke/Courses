import 'didactics/styles/kit.css';
import './styles/tokens.css';
import { courseFiles } from 'didactics/course';
import { defineCourse } from 'didactics/app';
import encyclopedia from 'virtual:didactics/encyclopedia';
import { el } from 'didactics/dom';
import { SITE_URL } from './asset';
import { FIGURES } from './figures';
import { prose } from './figures/kit';
import { BRANCHES, LESSONS, TRUNK } from './lessons';
import { PHOTOS } from './photos';
import { makeBanner } from './banner';
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
  hero: makeBanner,
  welcome: el('div', {},
    el('p', {}, 'In 399 BC Athens put Socrates to death for asking questions. The lessons follow the questions he started, in the order people asked them, from Plato\'s cave to whether a chatbot could feel pain. Each lesson opens on a real scene, and branches go outside Europe, into politics, and into the puzzles and tools of the trade.'),
    el('p', {}, 'Along the way you give verdicts: short multiple-choice questions, such as whether you would use an invisibility ring, answered before the argument comes. Your answer is saved, and often you then see how professional philosophers answered in a 2020 survey. The Verdicts page in the menu lists every answer, lets you change any of them, and points out pairs that contradict each other.')),
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
  encyclopedia: { data: encyclopedia, course: 'philosophy' },
  offline: { noun: 'photos' },
  text: {
    files: courseFiles(import.meta.glob('/src/lessons/*.json', { eager: true, import: 'default' })),
    code: () => import('virtual:didactics/code-text').then((m) => m.default),
  },
});
