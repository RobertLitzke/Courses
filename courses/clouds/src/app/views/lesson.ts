// What Clouds adds to a lesson (Didactics' lesson view, which main.ts sets up
// through defineCourse): its sky over the fields at the top, the clouds it
// introduces under the lede.

import { el } from 'didactics/dom';
import { genus } from '../../core/clouds';
import type { CloudLesson } from '../../core/lessons';
import { addToSky, placeCloud, SKY_SPOTS } from '../scene/drawn';
import { makeScene, W } from '../scene/landscape';

/** The sky over the fields, with the clouds this lesson is about. */
function hero(lesson: CloudLesson): Node {
  const scene = makeScene({ time: lesson.n % 2 ? 'dawn' : 'day', seed: 10 + lesson.n, sun: [0.78, 0.62] });
  const xs = lesson.sky.length === 1 ? [W * 0.55] : lesson.sky.map((_, i) => 70 + (i * (W - 140)) / (lesson.sky.length - 1));
  lesson.sky.forEach((id, i) => {
    const spot = SKY_SPOTS[id];
    addToSky(scene.sky, placeCloud(id, scene.palette, xs[i], spot.y, spot.scale, i + lesson.n));
  });
  return scene.root;
}

export const lessonOptions = {
  hero,
  intro: (lesson: CloudLesson) => (lesson.clouds.length ? el('ul.meet', {}, lesson.clouds.map((id) => el('li', {}, genus(id).name))) : null),
};
