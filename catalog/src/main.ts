import 'didactics/styles/review-all.css';
import 'didactics/styles/reading.css';
import './catalog.css';
import courses, { map } from 'virtual:courses';
import { allCoursesReview } from 'didactics/review-all';
import { el } from 'didactics/dom';
import { useReading } from 'didactics/reading';
import { homePage } from './home';
import { mapPage } from './page';
import { settingsPage } from './settings';

// The text size and look every course shares (the build's boot script set them before the first paint).
useReading();

const read = (key: string) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};
const write = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Private browsing: the hint comes back next time.
  }
};
// The shelves at the front; #review, the review of every course's cards
// together; #settings, what holds for every course; #map, the map and full listing, which any other anchor (a
// department, a bridge) is a place on.
const root = document.getElementById('catalog')!;
type View = 'home' | 'review' | 'settings' | 'map';
const viewOf = (hash: string): View => (hash === '#review' ? 'review' : hash === '#settings' ? 'settings' : hash === '' || hash === '#' ? 'home' : 'map');
let shown: View | null = null;
const show = () => {
  const view = viewOf(location.hash);
  if (view === shown) return;
  shown = view;
  if (view === 'review') {
    root.replaceChildren(el('div.catalog', {}, allCoursesReview({
      courses: courses.map((c) => ({ key: c.folder, title: c.title, save: c.save, href: `./${c.folder}/`, icon: c.icon, theme: c.theme })),
      back: { href: '#', label: '← The shelves' },
    })));
  } else if (view === 'settings') {
    root.replaceChildren(settingsPage(courses));
  } else if (view === 'map') {
    root.replaceChildren(mapPage(courses, read, map));
  } else {
    root.replaceChildren(homePage(courses, read, map, { write }));
  }
  const anchor = location.hash.length > 1 && location.hash !== '#map' && location.hash !== '#settings' ? document.getElementById(location.hash.slice(1)) : null;
  if (anchor) anchor.scrollIntoView();
  else window.scrollTo(0, 0);
};
window.addEventListener('hashchange', show);
// Coming back to the page (from a course, by Back) shows the desk as it is now.
window.addEventListener('pageshow', (e) => {
  if (e.persisted) {
    shown = null;
    show();
  }
});
show();

// The one service worker for the whole site: it keeps every course's page and
// photos for offline use. This page holds nothing of the reader's, so a new
// version is taken as soon as it is found.
if (import.meta.env.PROD && 'serviceWorker' in navigator && location.protocol.startsWith('http')) {
  void import('virtual:pwa-register').then(({ registerSW }) => {
    const update = registerSW({ immediate: true, onNeedRefresh: () => void update(true) });
  });
}
