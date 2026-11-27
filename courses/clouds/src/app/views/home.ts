// The dusk banner, and the lessons as a tree: the trunk of training, the
// branches that fork off it, and the cloud-seeding lesson hung off the end.
// With the radio on, the page tells the story and the opening talk plays the
// first time.

import { BRANCHES, TREE_LESSONS, lessonName } from '../../core/lessons';
import { el } from 'didactics/dom';
import { passed } from 'didactics/progress';
import { keepPlace } from 'didactics/place';
import type { View } from 'didactics/router';
import { doneLine, lessonGo, lessonStatus, markToggle, progressLine } from 'didactics/status';
import { nextLesson, treeView, type TreeNode } from 'didactics/tree';
import { makeBanner } from '../scene/banner';
import { getSave, updateSave } from '../store';
import { INTRO } from '../../core/talk';
import { clearRadio, playTalk } from '../radio';
import { releaseSlip, type CourseRelease } from 'didactics/release';
import course from '../../../course.json';

export const homeView: View = (root, nav) => {
  const save = getSave();
  // The dusk banner, in the look of the course icon (scene/banner.ts).
  const scene = makeBanner();

  type Item = (typeof TREE_LESSONS)[number];
  const nextUp = nextLesson(TREE_LESSONS, save) as Exclude<Item, { coming: true }> | undefined;
  const trained = passed(save, 'local-sky');
  /** Started, left part way, and still there to pick up. */
  const started = (s: Item) => !('coming' in s) && lessonStatus(save, s) === 'started';
  const names = (ls: readonly Item[]) => ls.map(lessonName).join(' and ');

  const card = ({ lesson: s, state, missing, wanting }: TreeNode<Item>) => {
    const rec = save.lessons[s.id];
    const standing = 'coming' in s ? 'new' : lessonStatus(save, s);
    const before = [...missing, ...wanting];
    const status = state === 'done' && rec ? doneLine(rec, save.talk ? 'Radio check' : 'Check')
      : state === 'skipped' ? 'Skipped'
        : state === 'coming' ? 'Coming'
          : started(s) ? progressLine(save, s)
            : before.length ? `Better after ${names(before)}`
              : null;
    return el('div.lesson-card', { className: `lesson-card stand-${standing}${state === 'next' ? ' next' : ''}` },
      el('div', {}, el('h3', {}, s.title), el('p', {}, s.teaches), status ? el('p.score', {}, status) : null),
      state !== 'coming' ? el('div.lesson-actions', {},
        lessonGo(`#/lesson/${s.id}`, standing),
        markToggle(save, s.id, updateSave, () => nav.replace('/home')),
      ) : null,
    );
  };

  const page = el(
    'div.home',
    {},
    el(
      'section.hero',
      {},
      scene,
      el(
        'div.hero-text',
        {},
        el('p.eyebrow', {}, save.talk ? `Harrow, Adams County, Washington · ${trained ? 1946 : 1931}` : 'A cloud workbook'),
        el('h1.poster-type', {}, 'Clouds'),
        el('p.subtitle.poster-type', {}, 'What are they up to?'),
      ),
    ),
    el(
      'section.page',
      {},
      el(
        'div.letter',
        {},
        save.name ? el('p', {}, `Welcome back, ${save.name}.`) : null,
        ...(save.talk
          ? [
              el('p', {}, 'It is 1931, and you are the new weather forecaster in Harrow, a wheat town in the dry hills of eastern Washington.'),
              el('p', {}, 'An old hand at Walla Walla, a few counties over, will come on the radio as you start each lesson, and quiz you at the end.'),
            ]
          : [el('p', {}, 'Short lessons on what a cloud is made of, how to name every kind, and what each one says about the weather to come. Branches fork off the main line for weather further afield, and the last lesson is on cloud seeding.')]),
      ),
      releaseSlip(course.release as CourseRelease),
      nextUp ? el('a.btn.btn-big', { href: `#/lesson/${nextUp.id}` }, started(nextUp) ? `Continue ${lessonName(nextUp).toLowerCase()}: ${nextUp.title}` : nextUp.n === 1 && !save.lessons[nextUp.id] ? 'Start the first lesson' : `${lessonName(nextUp)}: ${nextUp.title}`) : null,
      el('h2', {}, 'Lessons'),
      treeView({ lessons: TREE_LESSONS, branches: BRANCHES, save, card, remember: 'clouds.tree' }),
      // Open from the start: the natural skies can be made as soon as their
      // clouds are met; the seeding orders wait on the cloud-seeding lesson.
      el(
        'div.ref-card.seeding',
        {},
        el('h2', {}, 'The forecast desk: make the sky'),
        el('p', {}, 'Set the heat, the moisture and what lifts the air, and make the skies on the list. The orders marked Seed are for after the cloud-seeding lesson.'),
        el('a.btn', { href: '#/seed' }, 'Take the orders'),
      ),
    ),
  );
  root.append(page);
  const forget = keepPlace(page, 'clouds.home-place');

  // The opening talk, once, after the poster has had its moment. Turning the
  // radio off in it redraws the page without the story.
  let timer = 0;
  if (save.talk && !save.introSeen) {
    timer = window.setTimeout(() => {
      updateSave((s) => ({ ...s, introSeen: true }));
      void playTalk(INTRO).then((heard) => {
        if (heard && !getSave().talk) nav.replace('/home');
      });
    }, 1800);
  }
  return () => {
    forget();
    clearTimeout(timer);
    clearRadio();
  };
};
