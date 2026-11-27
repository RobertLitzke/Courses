import { defineConfig } from 'vite';
import { lessonApp } from 'didactics/vite';
import pkg from './package.json';

// The build is Didactics' (didactics/vite): the page with everything inlined,
// the same page again as dist/finance.html for Settings' download link, and a
// service worker entry. The course has no photos; its figures are all drawn.
export default defineConfig(
  lessonApp({
    root: __dirname,
    version: pkg.version,
    // Ports follow the local-dev port scheme: one block of ten per web project.
    port: 5510,
    // One of several courses on the site, in its folder: the site's build
    // (tools/build-site.mjs at the repo's root) writes the one service worker.
    inSite: true,
    // The site's encyclopedia, shared by every course (didactics/encyclopedia).
    encyclopedia: { dir: '../../encyclopedia', courses: '..' },
    oneFile: 'finance.html',
    manifest: {
      name: 'Money That Lasts: saving, spending and paying less tax',
      short_name: 'Money',
      description: 'Illustrated lessons on how a portfolio is built, spent and taxed over a lifetime.',
      // Keep in sync with --bg in src/styles/tokens.css.
      theme_color: '#17302a',
      id: '.',
      icons: [{ src: 'icons/icon.svg', sizes: 'any', type: 'image/svg+xml' }],
    },
  }),
);
