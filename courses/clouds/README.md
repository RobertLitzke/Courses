# Clouds: What are they up to?

A cloud workbook: how to name every kind of cloud, what made it, and what it
means for the weather to come. The drawings are set over Harrow, an invented
wheat town in eastern Washington. After the main line of lessons, branches
follow the weather further afield, and the last lesson is on cloud seeding,
where you start making clouds as well as reading them.

Until 2026-11-27 the course also had radio talks with an old hand at Walla
Walla, typed on a slip around each lesson; they were removed.

The look comes from the poster in `art/poster.jpg`, which is also the
loading screen: a violet and magenta evening,
heaped clouds with peach rims, slanted outlined lettering. The game draws
flat, lightly geometric landscapes and clouds in that palette for teaching,
and uses real photos for testing.

## What is built

- The shell: a vanilla TypeScript PWA on Vite, inlined into one
  `index.html` as in PatchMatch and Fretron, with a service worker, an update
  banner, and progress in `localStorage` with save-to-file and load.
- **Five lessons**, each an illustrated article in the manner of Bartosz
  Ciechanowski's explainers: paragraphs and live figures with sliders to play
  with. Each part opens once the small tasks in the figures above it are
  done; a finished lesson opens in full. Every lesson ends with a check
  (photos to name, and skies to forecast) and a signed logbook page.
  1. **The two textures**: what a cloud is, stable and unstable air, cumulus
     from thermals and stratus from a cooling night.
  2. **The low sky**: the three floors, stratocumulus under a lid, why most
     clouds don't rain, and nimbostratus.
  3. **The middle sky and the hand trick**: names as a code, judging height
     with your hand at arm's length, self-shadows, altocumulus and
     altostratus.
  4. **The ice realm and early warnings**: cirrus hooks, refraction through
     an ice prism, the 22° halo, and a warm front arriving over 48 hours.
  5. **Vertical giants and rare boss clouds**: a sounding that grows
     congestus and cumulonimbus, a storm's life, counting the thunder, and
     the rare lens, mammatus and Kelvin-Helmholtz clouds.
- The **field guide**: a card for each of the ten genera (what it looks like,
  what made it, what it means) and the rare sights, and the glossary.
- A **photo pipeline** that finds, credits and resizes photos from Wikimedia
  Commons (see below). Until photos are fetched, the check uses drawn
  clouds and says so.
- The cloud-seeding mode is shown on the board as opening after training.

## Run

Clouds is one course of several in this repository (see the README at its
root). Install once at the root, then run this course on its own:

```bash
npm install          # at the repository's root
npm run dev -w clouds
```

Opens on http://localhost:5420. On the dev server an orange strip appears
across the top if anything on a page is wider than the screen.
http://localhost:5420/figures.html shows every lesson figure on one page, for
checking drawings without playing through (dev server only). Add `?frozen` for
the same picture on every load, `?imperial` for imperial units, or
`?only=<figure id>` for one figure.

| Command | What it does |
|---|---|
| `npm test -w clouds` | Vitest: cloud facts, air physics, the save file, every figure built once (happy-dom), dealing the photo check, lesson content, photo credits |
| `npm run build -w clouds` | Typecheck, then build `dist/` |
| `npm run preview -w clouds` | Serve `dist/` on http://localhost:5421 |
| `npm run poster -w clouds` | Regenerate `public/poster.webp` from `art/poster.jpg` (icons come from `npm run icons` at the repository's root) |
| `npm run photos:find -- clouds` | At the root: list candidate photos from Commons into a contact sheet to pick from |
| `npm run photos -- clouds` | At the root: download the picked photos, resize them and write their credits |

## Photos

Every photo carries its author, licence and source, shown under the photo and
on the Credits page. Only public domain, CC0, CC BY and CC BY-SA photos are
accepted: no NonCommercial and no NoDerivatives (photos are resized and
cropped). The WMO International Cloud Atlas is the reference for names and
heights, but its photos are copyrighted and are not used. NOAA's photo
library is public domain and much of it is mirrored on Commons, so it comes
through the same search.

1. `npm run photos:find -- clouds` (at the root) searches the Commons
   categories in `tools/photo-search.json` and writes
   `tools/candidates/index.html`.
2. Open it, tap the photos that clearly show their cloud (Commons categories are often wrong), and add the JSON
   at the bottom to `tools/photo-picks.json` (one entry per photo, with its
   id; ids are kept for good, as saves remember photos by them).
3. `npm run photos -- clouds` re-reads each licence, downloads 1024-wide
   WebP copies into `public/photos/` and writes `src/data/photos.json`.
4. `npm test` checks every entry has a credit, an accepted licence and a
   source link.

The photo tools live at the repository's root (`tools/photos.mjs`,
`tools/photos-find.mjs`), one copy for every course.

Photos are not inlined into `index.html`. They are served beside it; the
site's service worker keeps each one once it has been seen, and Settings
saves them all for offline.

## Layout

```
src/core/     pure TypeScript, no DOM; unit-tested
  clouds.ts     the ten genera, the floors, the name roots
  air.ts        a rising parcel, the day's sounding, how tall a heap grows
  sky.ts        angular size, the warm front, night cooling, thunder
  optics.ts     light through an ice prism, the halo
  drops.ts      how fast drops fall and how far they get before evaporating
  lessons.ts    the lessons (parts of text and figures) and the tree
  photo-call.ts name-calls.ts  dealing the photo checks
  photos.ts     the photo entry shape and accepted licences
  save.ts       Clouds' save fields on top of Didactics' progress.ts
src/app/      store.ts, asset.ts, photos.ts
  scene/        landscape.ts (wheat country and the town), drawn.ts (drawn clouds)
  figures/      one file per lesson (fog.ts … seeding-limits.ts) with its live and
                still figures in lesson order; quizzes.ts the photo and forecast
                checks; kit.ts the palette over Didactics' figure.ts;
                draw.ts cloud and radar pieces over Didactics' draw.ts;
                index.ts naming them all
  views/        home, lesson, guide, sky, seed (the rest are Didactics' views)
tools/        gallery/, poster.mjs, photo-picks.json, photo-search.json (the photo tools are the root's)
test/
```

Everything that is not about clouds (the lesson engine and JSON lesson
format, figures, quiz scheduling, the log, the shell and the
build) is the Didactics library,
[RobertLitzke/Didactics](https://github.com/RobertLitzke/Didactics), imported
as `didactics/<module>`. It is a git dependency pinned to a commit in
package.json; to take a newer one, run
`npm install github:RobertLitzke/Didactics#<sha or tag>`.

The course's longer words are JSON in `src/data` (lessons, quiz
cards, glossary). To revise them in one file:

```sh
npx didactics-course export src/data --skip src/data/photos.json --code src --title Clouds --out course.json
npx didactics-course import course.json
```

`--code src` adds every string in the code that reads as words (figure
labels and commentary, headings, buttons, check feedback) under `"code"`,
one table per source file, as written → as edited; import writes the edited
ones back into the source.

Settings in the app has the same, code words included, for **All** or one
lesson picked from a menu (src/app/course-pieces.ts says what a lesson's
piece holds): **Download**, and **Load edited text** to read an edited file in the real
lessons on that device before it is committed (src/course.ts). Edited code
words show wherever the page has them as text, but not on the sky lab's
canvas. A lesson block is `text`, `key_ideas`, or a
callout by `id` for a drawing (`interactive_diagram`, `diagram`, `quiz`); an
id with no code yet shows a box saying it goes there.

## Deploy

Pushes to `main` build the whole site and deploy it to GitHub Pages
(`.github/workflows/pages.yml` at the repository's root); Clouds is served
from its folder, `/clouds/`, under the course catalog. In the repository's settings, Pages must be
set to deploy from GitHub Actions.
