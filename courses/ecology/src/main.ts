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
  id: 'ecology',
  title: 'Ecology',
  subtitle: 'Who lives where, and why',
  mark: el('img', { src: 'icons/icon.svg', alt: '' }),
  site: SITE_URL,
  lessons: LESSONS,
  branches: BRANCHES,
  welcome: el('div', {},
    el('p', {}, 'Each lesson starts from a puzzle that someone faced in the field: a count that made no sense, an island of starving reindeer, a predator taken away to see what would happen. The trunk is ecology anywhere. Branches take it further, to ants and to people, and to the tide pools, volcano, dry country and rivers of the Pacific Northwest.'),
    el('p', {}, 'Ecology and Botany lean on each other. Read together, a good order is Ecology 1 to 5, Botany 1 to 4, Ecology 6 to 9, Botany 5 to 11, then Ecology 10 onwards. Either course also stands alone.')),
  figures: FIGURES,
  prose,
  // "Lesson 3 of 19": the trunk's whole plan.
  lesson: { of: () => 19 },
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
  encyclopedia: { data: encyclopedia, course: 'ecology' },
  offline: { noun: 'photos' },
  text: {
    files: courseFiles(import.meta.glob('/src/lessons/*.json', { eager: true, import: 'default' })),
    code: () => import('virtual:didactics/code-text').then((m) => m.default),
  },
});
