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
import type { CourseRelease } from 'didactics/release';
import course from '../course.json';

defineCourse({
  release: course.release as CourseRelease,
  id: 'textiles',
  title: 'Fabric & Form',
  subtitle: 'How cloth is made and how it shaped the world',
  mark: el('img', { src: 'icons/icon.svg', alt: '' }),
  site: SITE_URL,
  lessons: LESSONS,
  branches: BRANCHES,
  hero: makeBanner,
  welcome: el('div', {},
    el('p', {}, 'Lessons 1 to 5 are about the cloth itself: fibre, yarn, weaving and knitting, and dye. From lesson 6 the course follows cloth through history in time order, from Roman purple to the cotton fields of today, and each lesson opens on a real scene with real people, places and dates.'),
    el('p', {}, 'Several figures are machines you can run: twist a yarn until it holds, build denim on a loom, dye in an indigo vat, sail a monsoon, and add the spinning and weaving machines one by one to a workshop to see where the work piles up. Branches hold fashion, the questions your own wardrobe raises, other structures such as lace and felt, and cloth traditions from around the world.')),
  figures: FIGURES,
  prose,
  // "Lesson 3 of 27": the trunk's whole plan.
  lesson: { of: () => TRUNK },
  save: { store, empty: emptySave },
  photos: {
    photos: PHOTOS,
    name: (p) => p.about,
  },
  settings: {
    about: el('p', {}, el('a', { href: '#/credits' }, 'Credits'), ': who made the pictures.'),
  },
  catalog: { href: '../' },
  encyclopedia: { data: encyclopedia, course: 'textiles' },
  offline: { noun: 'photos' },
  text: {
    files: courseFiles(import.meta.glob('/src/lessons/*.json', { eager: true, import: 'default' })),
    code: () => import('virtual:didactics/code-text').then((m) => m.default),
  },
});
