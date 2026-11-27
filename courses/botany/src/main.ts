import 'didactics/styles/kit.css';
import './styles/tokens.css';
import { courseFiles } from 'didactics/course';
import { defineCourse } from 'didactics/app';
import encyclopedia from 'virtual:didactics/encyclopedia';
import { el } from 'didactics/dom';
import { SITE_URL } from './asset';
import { FIGURES } from './figures';
import { prose } from './figures/kit';
import { BRANCHES, LESSONS } from './lessons';
import { PHOTOS } from './photos';
import type { CourseRelease } from 'didactics/release';
import course from '../course.json';

defineCourse({
  release: course.release as CourseRelease,
  id: 'botany',
  title: 'Botany',
  subtitle: 'How plants work',
  mark: el('img', { src: 'icons/icon.svg', alt: '' }),
  site: SITE_URL,
  lessons: LESSONS,
  branches: BRANCHES,
  welcome: el('div', {},
    el('p', {}, 'Each lesson opens on an old experiment: a willow grown in a tub for five years, a candle in a jar with a sprig of mint, a ring of bark cut from a trunk. From there it follows the evidence to what plants are actually doing, which is stranger than it looks. The trunk is plants anywhere. Branches go on to naming and keying plants, to crops and breeding, and to the oddest plants there are.'),
    el('p', {}, 'Botany and Ecology lean on each other. Read together, a good order is Ecology 1 to 5, Botany 1 to 4, Ecology 6 to 9, Botany 5 to 11, then Ecology 10 onwards. Either course also stands alone.')),
  figures: FIGURES,
  prose,
  // "Lesson 3 of 21": the trunk's whole plan.
  lesson: { of: () => 21 },
  save: { units: 'metric' },
  photos: {
    photos: PHOTOS,
    name: (p) => p.about,
  },
  settings: {
    units: { label: 'Distances in', imperial: 'Feet and miles', metric: 'Metres and kilometres' },
    about: el('p', {}, el('a', { href: '#/credits' }, 'Credits'), ': who took the photographs.'),
  },
  catalog: { href: '../' },
  encyclopedia: { data: encyclopedia, course: 'botany' },
  offline: { noun: 'photos' },
  text: {
    files: courseFiles(import.meta.glob('/src/lessons/*.json', { eager: true, import: 'default' })),
    code: () => import('virtual:didactics/code-text').then((m) => m.default),
  },
});
