import { defineConfig } from 'vite';
import { lessonApp } from 'didactics/vite';
import pkg from './package.json';

// The build is Didactics' (didactics/vite): the page with everything inlined,
// the same page again as dist/philosophy.html for Settings' download link, and
// a service worker entry. Photos sit in dist/photos/; the site's service
// worker keeps them for offline.
export default defineConfig(
  lessonApp({
    root: __dirname,
    version: pkg.version,
    // Ports follow the local-dev port scheme: one block of ten per web project.
    port: 5570,
    // One of several courses on the site, in its folder: the site's build
    // (tools/build-site.mjs at the repo's root) writes the one service worker.
    inSite: true,
    oneFile: 'philosophy.html',
    precache: ['photos/*.webp'],
    manifest: {
      name: "Philosophy: What was Plato's Gig?",
      short_name: 'Philosophy',
      description: 'Philosophy from Socrates to the present, one question a lesson.',
      // Keep in sync with --bg in src/styles/tokens.css.
      theme_color: '#2a1e1a',
      id: '.',
      icons: [{ src: 'icons/icon.svg', sizes: 'any', type: 'image/svg+xml' }],
    },
  }),
);
