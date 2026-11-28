import { defineConfig } from 'vite';
import { lessonApp } from 'didactics/vite';
import pkg from './package.json';

// The build is Didactics' (didactics/vite): the page with everything inlined,
// the same page again as dist/geology.html for Settings' download link, and
// a service worker. Photos and the map reliefs sit in dist/photos/ and
// dist/maps/, the plate model in dist/data/, all listed in offline.json; the
// site's service worker caches them as read, and Settings saves them all.
export default defineConfig(
  lessonApp({
    root: __dirname,
    version: pkg.version,
    // Ports follow the local-dev port scheme: one block of ten per web project.
    port: 5470,
    // One of several courses on the site, in its folder: the site's build
    // (tools/build-site.mjs at the repo's root) writes the one service worker.
    inSite: true,
    // The site's encyclopedia, shared by every course (didactics/encyclopedia).
    encyclopedia: { dir: '../../encyclopedia', courses: '..' },
    oneFile: 'geology.html',
    precache: ['photos/*.webp', 'maps/*.png', 'maps/*.json', 'data/*.json'],
    manifest: {
      name: 'Geology: mysteries in the rocks',
      short_name: 'Geology',
      description: 'Short illustrated lessons on reading rocks, each opening on a puzzle.',
      // Keep in sync with --bg in src/styles/tokens.css.
      theme_color: '#4a2618',
      id: '.',
      icons: [{ src: 'icons/icon.svg', sizes: 'any', type: 'image/svg+xml' }],
    },
  }),
);
