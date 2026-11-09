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
import type { CourseRelease } from 'didactics/release';
import course from '../course.json';

defineCourse({
  release: course.release as CourseRelease,
  id: 'systems',
  title: 'Systems at Scale',
  subtitle: 'How the big ones were built',
  mark: el('img', { src: 'icons/icon.svg', alt: '' }),
  site: SITE_URL,
  lessons: LESSONS,
  branches: BRANCHES,
  welcome: el('div', {},
    el('p', {}, 'Every large computer system was once small. A website ran on one machine until a link on a popular page brought it down; a database kept up until the writes did not; a cluster of a thousand cheap disks lost one every day. Each lesson opens on one of those moments, with the people who met it and the year, and works through the design they published: what it had to do, the numbers that shaped it, the data structure at its centre, what it gave up and how it behaves when parts of it fail.'),
    el('p', {}, 'The trunk runs roughly in the order the systems were built, from the late 1990s to the 2020s, and the figures are live: send requests through a design, push the load up, fail a server or cut a link and watch what happens. One branch takes the same ideas to maps and places. The other, the design studio, starts from a blank page each time and works a whole system out before comparing it with what a real team built.')),
  figures: FIGURES,
  prose,
  // "Lesson 3 of 24": the trunk's whole plan.
  lesson: { of: () => TRUNK },
  save: { units: 'metric' },
  photos: {
    photos: PHOTOS,
    name: (p) => p.about,
  },
  settings: {
    about: el('p', {}, el('a', { href: '#/credits' }, 'Credits'), ': who took the photographs.'),
  },
  catalog: { href: '../' },
  offline: { noun: 'photos' },
  text: {
    files: courseFiles(import.meta.glob('/src/lessons/*.json', { eager: true, import: 'default' })),
    code: () => import('virtual:didactics/code-text').then((m) => m.default),
  },
});
