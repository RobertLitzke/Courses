// @vitest-environment happy-dom
// The site's settings page (#settings): the reading controls every course
// shares, and the way to each course's own Settings.

import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { READING_KEY } from 'didactics/reading';
import { readCatalog } from '../registry';
import { homePage } from '../src/home';
import { settingsPage } from '../src/settings';

const courses = readCatalog(resolve(__dirname, '../../courses'));

describe('the site settings page', () => {
  it('holds the text size and look, kept for every course', () => {
    localStorage.clear();
    const page = settingsPage(courses);
    document.body.replaceChildren(page);
    page.querySelector<HTMLButtonElement>('.look-night')!.click();
    expect(document.documentElement.getAttribute('data-look')).toBe('night');
    expect(JSON.parse(localStorage.getItem(READING_KEY)!).look).toBe('night');
    page.querySelector<HTMLButtonElement>('.look-course')!.click();
    expect(document.documentElement.hasAttribute('data-look')).toBe(false);
  });

  it('links to every course’s own Settings, where its progress code is', () => {
    const links = [...settingsPage(courses).querySelectorAll<HTMLAnchorElement>('.set-courses a')].map((a) => a.getAttribute('href'));
    expect(links).toEqual(courses.map((c) => `./${c.folder}/#/settings`));
  });

  it('is reached from the front page', () => {
    const home = homePage(courses, () => null, { shelves: [], bridges: [], regions: [] } as never);
    expect([...home.querySelectorAll('.home-tools a')].map((a) => a.getAttribute('href'))).toContain('#settings');
  });
});
