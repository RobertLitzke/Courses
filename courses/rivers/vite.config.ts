import { defineConfig } from 'vite';
import { lessonApp } from 'didactics/vite';
import pkg from './package.json';

// The build is Didactics' (didactics/vite): the page with everything inlined,
// the same page again as dist/rivers.html for Settings' download link, and
// a service worker entry. Photos and map reliefs sit in dist/photos/ and
// dist/maps/; the site's service worker keeps them for offline.
export default defineConfig(
  lessonApp({
    root: __dirname,
    version: pkg.version,
    // Ports follow the local-dev port scheme: one block of ten per web project.
    port: 5530,
    // One of several courses on the site, in its folder: the site's build
    // (tools/build-site.mjs at the repo's root) writes the one service worker.
    inSite: true,
    // The site's encyclopedia, shared by every course (didactics/encyclopedia).
    encyclopedia: { dir: '../../encyclopedia', courses: '..' },
    oneFile: 'rivers.html',
    precache: ['photos/*.webp', 'maps/*'],
    manifest: {
      name: 'Rivers and the Salish Sea',
      short_name: 'Rivers',
      description: 'Short illustrated lessons on why the water does what it does, from the rain on a watershed to the tide in the Sound.',
      // Keep in sync with --bg in src/styles/tokens.css.
      theme_color: '#0c3a48',
      id: '.',
      icons: [{ src: 'icons/icon.svg', sizes: 'any', type: 'image/svg+xml' }],
    },
  }),
);
