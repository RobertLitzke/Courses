import { defineConfig } from 'vite';
import { lessonApp } from 'didactics/vite';
import pkg from './package.json';

// The build is Didactics' (didactics/vite): the page with everything inlined,
// the same page again as dist/botany.html for Settings' download link, and
// a service worker entry. Photos sit in dist/photos/; the site's service
// worker keeps them for offline.
export default defineConfig(
  lessonApp({
    root: __dirname,
    version: pkg.version,
    // Ports follow the local-dev port scheme: one block of ten per web project.
    port: 5500,
    // One of several courses on the site, in its folder: the site's build
    // (tools/build-site.mjs at the repo's root) writes the one service worker.
    inSite: true,
    // The site's encyclopedia, shared by every course (didactics/encyclopedia).
    encyclopedia: { dir: '../../encyclopedia', courses: '..' },
    oneFile: 'botany.html',
    precache: ['photos/*.webp'],
    manifest: {
      name: 'Botany: how plants work',
      short_name: 'Botany',
      description: 'Short illustrated lessons on how plants work, each opening on an old experiment.',
      // Keep in sync with --bg in src/styles/tokens.css.
      theme_color: '#1b2a1c',
      id: '.',
      icons: [{ src: 'icons/icon.svg', sizes: 'any', type: 'image/svg+xml' }],
    },
  }),
);
