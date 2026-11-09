import { resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import { courseFilesRoute } from 'didactics/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { readCatalog, readMap } from './registry';

// The catalog page, built last, into the root of the site's dist/ after every
// course has been built into its own folder there (tools/build-site.mjs). Its
// service worker is the whole site's: it precaches the catalog and every
// course's page, icons and poster, so the one installed app opens offline in
// every course. A course's photos, maps and data files are not downloaded on
// install (they run to hundreds of files): the worker keeps each as it is
// first fetched, and a course's Settings page saves them all at once
// (didactics/offline, from the offline.json each course's build writes).

const courses = resolve(__dirname, '../courses');
/** The courses on the site, for the manifest's description: never a stale list. */
const courseNames = readCatalog(courses).map((c) => c.title.toLowerCase());

/** Serves `virtual:courses`: every course's course.json and the catalog's map, read when the page is built. */
function coursesModule(): Plugin {
  const id = '\0virtual:courses';
  return {
    name: 'catalog-courses',
    resolveId: (source) => (source === 'virtual:courses' ? id : null),
    load(source) {
      if (source !== id) return null;
      const all = readCatalog(courses);
      const map = readMap(resolve(__dirname, 'map.json'), all);
      return `export default ${JSON.stringify(all)};\nexport const map = ${JSON.stringify(map)};`;
    },
  };
}

export default defineConfig({
  root: __dirname,
  // Relative, so the site works from a GitHub Pages sub-path.
  base: './',
  // Ports follow the local-dev port scheme: one block of ten per web project.
  server: { port: 5410, strictPort: true },
  preview: { port: 5411, strictPort: true },
  build: { target: 'es2022', outDir: resolve(__dirname, '../dist'), emptyOutDir: false },
  plugins: [
    coursesModule(),
    viteSingleFile(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: null, // registered in src/main.ts and by each course
      includeManifestIcons: false,
      workbox: {
        globPatterns: ['index.html', 'icons/*.{png,svg}', '*/index.html', '*/poster.webp', '*/offline.json', '*/icons/*.{png,svg}'],
        runtimeCaching: [courseFilesRoute()],
        inlineWorkboxRuntime: true,
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        // Clouds' inlined page is the largest file.
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        // Nothing here has a hashed name, so every file gets a revision.
        dontCacheBustURLsMatching: /^(?!)/,
      },
      manifest: {
        name: 'Course Catalog',
        short_name: 'Courses',
        description: `Interactive workbooks: ${courseNames.join(', ')}.`,
        // What Chrome knows the installed app by. Changing it makes a new app:
        // the way past an install Chrome remembers but the phone no longer has
        // (it offers Install, then says the app is already installed). That
        // happened with the default id on 2026-10-26 and with 'clouds-app' on
        // 2026-11-09. Saved progress belongs to the site, not the id, so a
        // reinstall under a new id keeps it; a phone that still has the old
        // app keeps working and can install this one beside it.
        id: 'courses-2026-11',
        theme_color: '#f4f1e8',
        background_color: '#f4f1e8',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '.',
        scope: '.',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: 'icons/icon.svg', sizes: 'any', type: 'image/svg+xml' },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
});
