// The soil profile banner at the top, a word on what this is, the lesson board (the
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
        el('div.hero-text', {}, el('p.eyebrow', {}, 'A gardener’s workbook'), el('h1', {}, 'Dirt'), el('p.subtitle', {}, 'What is going on under your garden')),
      ),
      el(
        'section.page',
        {},
        el(
          'div.letter',
          {},
          save.name ? el('p', {}, `Welcome back, ${save.name}.`) : null,
          el('p', {}, `${LESSONS.length} short lessons on the ground your plants grow in: what it is made of, how it holds water and air, what lives in it, and how to feed it and build it up year on year. Each one has drawings to play with and a few questions at the end.`),
        ),
        releaseSlip(course.release as CourseRelease),
        nextUp ? el('a.btn.btn-big', { href: `#/lesson/${nextUp.id}` }, leftPartWay(nextUp) ? `Continue lesson ${nextUp.n}: ${nextUp.title}` : save.lessons[nextUp.id] || nextUp.n > 1 ? `Lesson ${nextUp.n}: ${nextUp.title}` : 'Start the first lesson') : null,
        el('h2', {}, 'Lessons'),
        board,
        el(
          'div.ref-card',
          {},
          el('h2', {}, 'Reference'),
          el('p', {}, 'Everything the lessons cover, set out to look up in the garden: the texture triangle, tests to do at home, a glossary, compost ratios, nutrients and pH, cover crops and a symptom finder.'),
          el('a.btn', { href: '#/reference' }, 'Open the reference'),
        ),
      ),
    ),
  );
  return keepPlace(root, 'soil.home-place');
};
