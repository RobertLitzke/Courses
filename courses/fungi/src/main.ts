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
  id: 'fungi',
  title: 'Fungi',
  subtitle: 'Threads in the dark',
  mark: el('img', { src: 'icons/icon.svg', alt: '' }),
  site: SITE_URL,
  lessons: LESSONS,
  branches: BRANCHES,
  welcome: el('div', {},
    el('p', {}, 'A mushroom is the fruit of something you rarely see: a net of threads finer than a hair, running through soil, leaf litter and wood. Each lesson opens on a real puzzle, a ring of dark grass in a meadow, a spoiled plate in a London laboratory, a fossil trunk eight metres tall, and follows the evidence to what fungi are doing. The trunk is fungi anywhere. Branches go on to lichens, to fungi of the Pacific Northwest, and to how mycologists look at a fungus.'),
    el('p', {}, 'This course is about how fungi live. It gives no advice on eating any wild fungus. Several lessons lean on Botany and Ecology, and say so where they do; each also stands alone.')),
  figures: FIGURES,
  prose,
  // "Lesson 3 of 16": the trunk's whole plan.
  lesson: { of: () => 16 },
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
  encyclopedia: { data: encyclopedia, course: 'fungi' },
  offline: { noun: 'photos' },
  text: {
    files: courseFiles(import.meta.glob('/src/lessons/*.json', { eager: true, import: 'default' })),
    code: () => import('virtual:didactics/code-text').then((m) => m.default),
  },
});
