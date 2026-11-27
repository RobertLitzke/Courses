import { defineConfig } from 'vite';
import { lessonApp } from 'didactics/vite';
import pkg from './package.json';

// The build is Didactics' (didactics/vite): everything
// inlined into dist/index.html, the same page again as dist/out-of-auto.html for
// Settings' download link, and a service worker. Photos sit in dist/photos/,
// listed in offline.json; the site's service worker caches each as it is read,
// and Settings saves them all at once.
export default defineConfig(
  lessonApp({
    root: __dirname,
    version: pkg.version,
    // Ports follow the local-dev port scheme: one block of ten per web project.
    port: 5460,
    // One of several courses on the site, in its folder: the site's build
    // (tools/build-site.mjs at the repo's root) writes the one service worker.
    inSite: true,
    // The site's encyclopedia, shared by every course (didactics/encyclopedia).
    encyclopedia: { dir: '../../encyclopedia', courses: '..' },
    oneFile: 'out-of-auto.html',
    precache: ['photos/*.webp', 'stage/**/*.webp'],
    manifest: {
      name: 'Photography: Out of Auto',
      short_name: 'Out of Auto',
      description: 'Short illustrated lessons on photography for nature with a long zoom: exposure, focus, movement, grain, reach and colour.',
      // Keep in sync with --bg in src/app/styles/tokens.css.
      theme_color: '#1d2430',
    },
  }),
);
