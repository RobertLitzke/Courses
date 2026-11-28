// The site's settings page (#settings): what holds for every course at once,
// the text size and look (didactics/reading), and the way to each course's
// own Settings, where its progress lives, and which deploy this is with a
// check for updates.

import { el } from 'didactics/dom';
import { readingControls } from 'didactics/reading';
import type { CatalogEntry } from '../registry';
import { buildLine } from './home';

export function settingsPage(courses: readonly CatalogEntry[]): HTMLElement {
  return el('div.catalog.site-settings', {},
    el('p.ra-back', {}, el('a', { href: '#' }, '← The shelves')),
    el('h1', {}, 'Settings'),
    el('section', { 'aria-labelledby': 'set-reading' },
      el('h2#set-reading', {}, 'Reading'),
      el('p', {}, 'The text size and look apply here and in every course, on this device. Paper makes the pages light and Night makes them dark; each course keeps its accent colours, and its figures keep their own colours. The same controls are under Aa in every course’s top bar.'),
      readingControls(),
    ),
    el('section', { 'aria-labelledby': 'set-courses' },
      el('h2#set-courses', {}, 'Each course'),
      el('p', {}, 'Progress is kept by each course in this browser. A course’s own Settings has its progress code, to carry what you have done to another device, and saving it all to a file.'),
      el('ul.set-courses', {}, courses.map((c) =>
        el('li', {},
          el('img.ico', { src: c.icon, alt: '' }),
          el('span.set-course', {}, el('strong', {}, c.title), el('small', {}, `${c.release.version}${c.release.stage === 'beta' ? ' beta' : ''}`)),
          el('a.btn.ghost.small', { href: `./${c.folder}/#/settings` }, 'Settings'),
        ))),
    ),
    el('section', { 'aria-labelledby': 'set-site' },
      el('h2#set-site', {}, 'This site'),
      el('p', {}, 'Installed as an app, the site takes a new version when it is next opened. Check now to take one at once.'),
      buildLine(),
    ),
  );
}
