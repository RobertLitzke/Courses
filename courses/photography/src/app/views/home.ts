// The ridges through the aperture at the top, a word on what this is, the lesson board (the
// written lessons open, the rest shown as coming; each can be marked done or not done), and the way to the
// reference page.

import { el } from 'didactics/dom';
import { keepPlace } from 'didactics/place';
import type { View } from 'didactics/router';
import { doneLine, lessonGo, lessonStatus, markToggle, progressLine } from 'didactics/status';
import { isWritten, LESSONS } from '../../core/lessons';
import { makeBanner } from '../scene/banner';
import { store } from '../../store';
import { releaseSlip, type CourseRelease } from 'didactics/release';
import course from '../../../course.json';

export const homeView: View = (root, nav) => {
  const save = store.get();
  const written = LESSONS.filter(isWritten);
  const nextUp = written.find((l) => !save.lessons[l.id]?.done);
  // A lesson left part way opens where the reader was (Didactics' resume.ts).
  const leftPartWay = (l: (typeof LESSONS)[number]) => lessonStatus(save, l) === 'started';

  const board = el(
    'ol.lesson-board',
    {},
    LESSONS.map((l) => {
      const rec = save.lessons[l.id];
      const open = isWritten(l);
      const standing = open ? lessonStatus(save, l) : 'new';
      return el(
        'li.lesson-card',
        { className: `lesson-card ${rec?.done ? 'done' : open ? 'open' : 'soon'} stand-${standing}`, dataset: { lesson: l.id } },
        el('span.lesson-n', {}, String(l.n)),
        el('div', {}, el('h3', {}, l.title), el('p', {}, l.teaches), rec?.done ? el('p.score', {}, doneLine(rec)) : standing === 'started' ? el('p.score', {}, progressLine(save, l)) : null),
        open ? el('div.lesson-actions', {}, lessonGo(`#/lesson/${l.id}`, standing), markToggle(save, l.id, store.update, () => nav.replace('/home'))) : el('span.tag', {}, 'Coming'),
      );
    }),
  );

  root.append(
    el(
      'div.home',
      {},
      el(
        'section.hero',
        {},
        makeBanner(),
        el('div.hero-text', {}, el('p.eyebrow', {}, 'Photography · a field workbook'), el('h1', {}, 'Out of Auto'), el('p.subtitle', {}, 'Photographing what is out there, on purpose')),
      ),
      el(
        'section.page',
        {},
        el(
          'div.letter',
          {},
          save.name ? el('p', {}, `Welcome back, ${save.name}.`) : null,
          el('p', {}, `${LESSONS.length} short lessons on what a camera is deciding for you and how to take each decision back: light and exposure, what stays sharp, movement, grain, reach, focus and colour. Written for nature photography with a long zoom, with figures that work on real photographs rather than diagrams of them.`),
        ),
        releaseSlip(course.release as CourseRelease),
        nextUp ? el('a.btn.btn-big', { href: `#/lesson/${nextUp.id}` }, leftPartWay(nextUp) ? `Continue lesson ${nextUp.n}: ${nextUp.title}` : save.lessons[nextUp.id] || nextUp.n > 1 ? `Lesson ${nextUp.n}: ${nextUp.title}` : 'Start the first lesson') : null,
        el('h2', {}, 'Lessons'),
        board,
        el(
          'div.ref-card',
          {},
          el('h2', {}, 'Reference'),
          el('p', {}, 'What the lessons teach, set out to look up in the field: the four decisions, the stop scale, the camera at a glance, and settings to start from.'),
          el('a.btn', { href: '#/reference' }, 'Open the reference'),
        ),
      ),
    ),
  );
  return keepPlace(root, 'photography.home-place');
};
