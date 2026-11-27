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
  id: 'rivers',
  title: 'Rivers and the Salish Sea',
  subtitle: 'Why the water does what it does',
  mark: el('img', { src: 'icons/icon.svg', alt: '' }),
  site: SITE_URL,
  lessons: LESSONS,
  branches: BRANCHES,
  welcome: el('div', {},
    el('p', {}, 'Rain lands on the Cascades and the Olympics, gathers into creeks and rivers, sinks into gravel, fills lakes and pours into a fjord full of salt water that rises and falls twice a day. Each lesson opens on something you can see from a bank, a bridge or a ferry in western Washington, a river running brown in November, a lake that fell three metres in 1916, a pass where the water runs faster than a person can swim, and follows the physics to why.'),
    el('p', {}, 'The trunk goes from the rain to the beach. Branches go on to the Columbia, to the waterworks of Seattle, and out into the field with a tide table. This course is about the water itself; what lives in it is for another course. Where Clouds, Geology or Astronomy already explain something, the lesson says so and points there.')),
  figures: FIGURES,
  prose,
  // "Lesson 3 of 12": the trunk's whole plan.
  lesson: { of: () => TRUNK },
  save: { units: 'metric' },
  photos: {
    photos: PHOTOS,
    name: (p) => p.about,
  },
  settings: {
    units: { label: 'Distances in', imperial: 'Feet and miles', metric: 'Metres and kilometres' },
    about: el('p', {}, el('a', { href: '#/credits' }, 'Credits'), ': who took the photographs, and where the map reliefs come from.'),
  },
  catalog: { href: '../' },
  encyclopedia: { data: encyclopedia, course: 'rivers' },
  offline: { noun: 'photos and maps' },
  text: {
    files: courseFiles(import.meta.glob('/src/lessons/*.json', { eager: true, import: 'default' })),
    code: () => import('virtual:didactics/code-text').then((m) => m.default),
  },
});
