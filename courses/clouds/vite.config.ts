import { defineConfig } from 'vite';
import { lessonApp } from 'didactics/vite';
import pkg from './package.json';

// The build is Didactics' (didactics/vite, src/vite.ts in that repo): everything
// inlined into dist/index.html, the same page again as dist/clouds.html for
// Settings' download link, and a service worker. Photos are too many and too
// large to inline into the page itself, so they sit in dist/photos/, listed in
// offline.json; the site's service worker caches each as it is read, and
// Settings saves them all at once. dist/clouds-offline.html is the one-file
// copy with every photo inlined (about 13 MB), for when no install is possible.
export default defineConfig(
  lessonApp({
    root: __dirname,
    version: pkg.version,
    // Ports follow the local-dev port scheme: one block of ten per web project.
    port: 5420,
    oneFile: 'clouds.html',
    offlineFile: 'clouds-offline.html',
    precache: ['poster.webp', 'photos/*.webp'],
    // One of several courses on the site, in its folder: the site's build
    // (tools/build-site.mjs at the repo's root) writes the one service worker.
    inSite: true,
    // The site's encyclopedia, shared by every course (didactics/encyclopedia).
    encyclopedia: { dir: '../../encyclopedia', courses: '..' },
    manifest: {
      name: 'Clouds: What are they up to?',
      short_name: 'Clouds',
      description: 'A cloud-watching game: learn every kind of cloud, what made it and what it means.',
      // Not the default (start_url): Rob's Chrome remembered an install that
      // had vanished from the phone and refused to install again (2026-10-26).
      id: 'clouds-app',
      // Keep in sync with --bg in src/app/styles/tokens.css.
      theme_color: '#2d2358',
    },
  }),
);
