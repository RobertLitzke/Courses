// The board banner at the top, a word on what this is, the lessons by track (the
// core path, then the pedal and solar branches that grow from it; written
// lessons open, the rest shown as coming), and the way to the reference page.

import { el } from 'didactics/dom';
import { keepPlace } from 'didactics/place';
import type { View } from 'didactics/router';
import { doneLine, lessonGo, lessonStatus, markToggle, progressLine } from 'didactics/status';
import { isWritten, LESSONS, lessonsIn, TRACKS, type Lesson } from '../../core/lessons';
import { makeBanner } from '../scene/banner';
import { store } from '../../store';
import { releaseSlip, type CourseRelease } from 'didactics/release';
import course from '../../../course.json';

export const homeView: View = (root, nav) => {
  const save = store.get();
  const written = LESSONS.filter(isWritten);
  const nextUp = written.find((l) => !save.lessons[l.id]?.done);
  // A lesson left part way opens where the reader was (Didactics' resume.ts).
  const leftPartWay = (l: Lesson) => lessonStatus(save, l) === 'started';

  const card = (l: Lesson) => {
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
  };

  const tracks = TRACKS.map((t) =>
    el(
      'section.track',
      { className: `track track-${t.id}` },
      el('h2', {}, t.title),
      el('p.track-blurb', {}, t.blurb),
      el('ol.lesson-board', {}, lessonsIn(t.id).map(card)),
    ),
  );

  root.append(
    el(
      'div.home',
      {},
      el(
        'section.hero',
        {},
        makeBanner(),
        el('div.hero-text', {}, el('p.eyebrow', {}, 'A workbook on circuits'), el('h1', {}, 'Circuitry'), el('p.subtitle', {}, 'What the electricity is actually doing')),
      ),
      el(
        'section.page',
        {},
        el(
          'div.letter',
          {},
          save.name ? el('p', {}, `Welcome back, ${save.name}.`) : null,
          el('p', {}, 'Short lessons for anyone who can solder and wants to design: what voltage and current really are, how parts shape them, and how to find out why a board doesn’t work. Every circuit is live. The wires are coloured by their voltage and the dots move with the current, so you can watch what a change does.'),
          el('p', {}, 'Start with the core path. Two branches grow from it, guitar pedals and off-grid solar, each leaning on what the core teaches.'),
        ),
        releaseSlip(course.release as CourseRelease),
        nextUp ? el('a.btn.btn-big', { href: `#/lesson/${nextUp.id}` }, save.lessons[nextUp.id] || leftPartWay(nextUp) ? `Lesson ${nextUp.n}: ${nextUp.title}` : 'Start the first lesson') : null,
        tracks,
        el(
          'div.ref-card',
          {},
          el('h2', {}, 'Reference'),
          el('p', {}, 'What the lessons cover, set out to look up at the bench: Ohm’s law with a live circuit, part markings, wire and trace sizes, the multimeter, solder faults, pedal standards and solar sizing.'),
          el('a.btn', { href: '#/reference' }, 'Open the reference'),
        ),
      ),
    ),
  );
  return keepPlace(root, 'electronics.home-place');
};
