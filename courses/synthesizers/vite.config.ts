import { readdirSync } from 'node:fs';
import { defineConfig } from 'vite';
import { lessonApp } from 'didactics/vite';
import pkg from './package.json';

// The build is Didactics' (didactics/vite): the page with everything inlined,
// the same page again as dist/synthesizers.html for Settings' download link,
// and a service worker entry. audit.html and audition.html (tools/) are
// PatchMatch's dev-only pages: the dev server serves them, a build leaves them out.
export default defineConfig(
  lessonApp({
    root: __dirname,
    version: pkg.version,
    // Ports follow the local-dev port scheme: one block of ten per web project.
    // 5400 was PatchMatch's own.
    port: 5400,
    inSite: true,
    encyclopedia: { dir: '../../encyclopedia', courses: '..' },
    oneFile: 'synthesizers.html',
    precache: ['photos/*.webp'],
    // The words in the code, for the course file: everything but the riffs,
    // whose titles and notes are tunes, not prose (and the site leaves the
    // copyrighted ones out altogether: .env.production).
    codeText: ['src/main.ts', 'src/lessons.ts', 'src/audio', 'src/figures', 'src/game', ...readdirSync(`${__dirname}/src/core`).filter((f) => f !== 'riffs').map((f) => `src/core/${f}`)],
    manifest: {
      name: 'Synthesizers: how a sound is built',
      short_name: 'Synthesizers',
      description: 'Short lessons on how a synthesizer builds a sound, on a live synth you play as you read.',
      // Keep in sync with --bg in src/styles/tokens.css.
      theme_color: '#08090f',
      id: '.',
      icons: [{ src: 'icons/icon.svg', sizes: 'any', type: 'image/svg+xml' }],
    },
  }),
);
