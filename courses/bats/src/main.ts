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
import type { CourseRelease } from 'didactics/release';
import course from '../course.json';

defineCourse({
  release: course.release as CourseRelease,
  id: 'bats',
  title: 'Bats',
  subtitle: 'Seeing with sound',
  mark: el('img', { src: 'icons/icon.svg', alt: '' }),
  site: SITE_URL,
  lessons: LESSONS,
  branches: BRANCHES,
  welcome: el('div', {},
    el('p', {}, 'At dusk over a lake, small dark shapes flicker low over the water, turning sharper than any swallow. They are bats, hunting insects they cannot see by shouting too high for us to hear and listening for the echoes. Each lesson opens on a real puzzle, from an Italian priest blinding bats in 1793 to a cave where hibernating bats die in February, and follows the people who solved it. The trunk is bats anywhere; branches go to the bats of the Pacific Northwest, to listening in with a detector, and to bats and people.'),
    el('p', {}, 'The calls in the figures are made by the page from published measurements and slowed down so you can hear them. Ecology, Fungi and Synthesizers lean in here and there, and say so where they do; this course also stands alone.')),
  figures: FIGURES,
  prose,
  // "Lesson 3 of 11": the trunk's whole plan.
  lesson: { of: () => TRUNK },
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
  encyclopedia: { data: encyclopedia, course: 'bats' },
  offline: { noun: 'photos' },
  text: {
    files: courseFiles(import.meta.glob('/src/lessons/*.json', { eager: true, import: 'default' })),
    code: () => import('virtual:didactics/code-text').then((m) => m.default),
  },
});
