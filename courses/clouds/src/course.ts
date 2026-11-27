// Clouds' words as this browser has them. All of the text can be downloaded
// from Settings as one course file, edited, and loaded back to read here
// before it is committed (Didactics' course.ts): every JSON file in src/data
// except the photo library (the lessons, the quiz cards and the glossary), and under "code" the words written in the source (figure
// labels and commentary, headings, buttons; Didactics' code-text.ts).
// The course's file of the site's encyclopedia goes in too.
// main.ts imports this first, so edited words are in place before any module
// reads them. In the repository, `npx didactics-course export src/data --skip
// src/data/photos.json --code src --title Clouds` and `npx didactics-course
// import course.json` do the same with the files themselves.

import { courseEdits, courseFiles } from 'didactics/course';
import encyclopedia from 'virtual:didactics/encyclopedia';

export const COURSE = courseEdits({
  key: 'clouds.course',
  title: 'Clouds',
  files: {
    ...courseFiles(import.meta.glob(['/src/data/**/*.json', '!/src/data/photos.json'], { eager: true, import: 'default' })),
    // Clouds' file of the site's encyclopedia, which lives at the repository's root:
    // `npx didactics-course import course.json --map encyclopedia/=../../encyclopedia/` puts it back.
    ...(encyclopedia.files['encyclopedia/clouds.json'] ? { 'encyclopedia/clouds.json': encyclopedia.files['encyclopedia/clouds.json'] } : {}),
  },
  code: () => import('virtual:didactics/code-text').then((m) => m.default),
});
