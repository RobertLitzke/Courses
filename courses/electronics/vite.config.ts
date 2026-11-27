import { defineConfig } from 'vite';
import { lessonApp } from 'didactics/vite';
import pkg from './package.json';

// The build is Didactics' (didactics/vite): everything
// inlined into dist/index.html, the same page again as dist/circuitry.html for
// Settings' download link, and a service worker.
export default defineConfig(
  lessonApp({
    root: __dirname,
    version: pkg.version,
    // Ports follow the local-dev port scheme: one block of ten per web project.
    port: 5450,
    // One of several courses on the site, in its folder: the site's build
    // (tools/build-site.mjs at the repo's root) writes the one service worker.
    inSite: true,
    // The site's encyclopedia, shared by every course (didactics/encyclopedia).
    encyclopedia: { dir: '../../encyclopedia', courses: '..' },
    oneFile: 'circuitry.html',
    manifest: {
      name: 'Circuitry: a workbook on circuits',
      short_name: 'Circuitry',
      description: 'Short interactive lessons on circuits: voltage and current you can watch, parts, debugging boards, guitar pedals and off-grid solar.',
      // Keep in sync with --bg in src/app/styles/tokens.css.
      theme_color: '#0f2a22',
    },
  }),
);
