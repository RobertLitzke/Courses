# Courses

Interactive workbooks, each a course of short illustrated lessons with live
diagrams, a check at the end of each lesson, and flash cards, built on
[Didactics](https://github.com/RobertLitzke/Didactics). The site opens on a
course catalog; each course opens in its own folder, in its own look.

Live at https://robertlitzke.github.io/Courses/. That address is written in one
place, `homepage` in package.json; every path on the site is relative, and only
a course's one-file copy opened from disk uses it, to fetch its photos.

## Layout

```
catalog/            the site's front page: the course catalog, and the one
                    service worker and manifest for the whole site
courses/<folder>/   one course, everything of its own: lessons, quizzes,
                    figures, simulations, photos, styles, tests, tools
  course.json       what the catalog shows: title, department, summary,
                    icon, where its lessons are, its save's key, and its
                    release (version, beta or released)
models/<name>/      a simulation more than one course runs, too specific for
                    Didactics: a workspace package courses import by name
  sandtable/        rain, rivers, tides and waves over a grid of heights,
                    wearing ground away and laying sand down (Rivers, Geology)
tools/              what every course shares at the command line:
  build-site.mjs      builds every course into dist/<folder>/, then the catalog
  photos.mjs          fetches a course's photos from its tools/photo-picks.json
  photos-find.mjs     a contact sheet of Commons candidates to pick from
  restore-photos.mjs  puts parked photo blocks back into lessons
  copyedit.mjs        the Gemini copy edit, with each course's brief (lessons, and --description)
  outline.mjs         a course's catalog description with every lesson under it
  review-queue.mjs    runs the copy edits waiting in every course
  status.mjs          the lesson status table (docs/status.md), with tools/lesson-status.json
  release.mjs         a course's version: npm run release -- <course> "What changed" (CLAUDE.md)
  process-icons.mjs   crops every course's icons from the painted sheets in catalog/icons/
  lib/                the pieces the tools share (Commons, course folders)
tsconfig.base.json  the compiler options every workspace extends
```

The rule: anything that names a course lives in its folder. Anything two
courses need goes into Didactics, as a small module that knows neither,
unless it is a subject's own simulation (a water and erosion model, say):
that goes in `models/`, as a workspace package with its own tests, which a
course lists in its package.json (`"sandtable": "*"`) and imports by name
(`sandtable/table`). The course passes in its own colours and sliders, so a
colour keeps its meaning there.

A course's folder is its address on the site (`/clouds/`) and is a plain
lowercase word or two naming its subject (the catalog's test checks this).

| Folder | Course | Save key |
| --- | --- | --- |
| `courses/clouds` | Clouds: What are they up to? | `clouds.save` |
| `courses/soil` | Dirt: a soil workbook | `dirt.save` |
| `courses/electronics` | Circuitry: a circuits workbook (its solver is the workspace `courses/electronics/packages/circuit-kit`) | `circuitry.save` |
| `courses/photography` | Out of Auto: a field workbook | `outofauto.save` |
| `courses/geology` | Geology: mysteries in the rocks (its map reliefs are made by `tools/geo/relief.mjs`) | `geology.save` |
| `courses/astronomy` | Astronomy: how we found out | `astronomy.save` |
| `courses/botany` | Botany: how plants work | `botany.save` |
| `courses/ecology` | Ecology: who lives where, and why | `ecology.save` |
| `courses/synthesizers` | Synthesizers: how a sound is built (with PatchMatch, the ear-training game, at `#/ear`; its own progress stays under `patchmatch.save`) | `synthesizers.save` |

Dirt, Circuitry and Out of Auto came in from their own repositories
(RobertLitzke/Dirt, Circuitry, Photography), and Synthesizers from PatchMatch
(RobertLitzke/PatchMatch), with their history, by
`git subtree add`.

Each course keeps its own `localStorage` keys (`<id>.save`, `<id>.course`, …),
so progress made before the courses moved here is still found: the site is on
the same origin.

## Run

```bash
npm install                 # once, at the root: one lockfile for every course
npm run dev -w clouds       # one course on its own dev server (its own port)
npm run dev -w catalog      # the catalog, on http://localhost:5410
npm test                    # every course's tests and the catalog's
npm run build               # the whole site into dist/
npm run preview             # serve dist/ on http://localhost:5411
npm run photos -- geology   # fetch a course's pictures (tools/photo-picks.json; Didactics' picture pipeline)
npm run pictures:check      # every course's picture records, and none on Commons' inaccurate-paleoart list
npm run pictures:paleoart   # save that list again to tools/inaccurate-paleoart.json (your own computer)
npm run copyedit -- geology dunes --write   # the Gemini copy edit of a lesson
```

Each course's README has its own commands (`npm run poster -w clouds`, say).
The root `tools/` holds one copy of each tool the courses share; a course
keeps in its `tools/` only what is its own: its photo picks
and search categories, its copy-edit brief (`copyedit.json`), its review
queue. The dependency on Didactics is pinned once, in the root
`package.json`, and every workspace extends `tsconfig.base.json`
(`catalog/test/site.test.ts` holds them to it).

How to plan a course and write a lesson, and the steps each lesson goes
through, are in the lesson guide, a Claude Doc Rob edits (linked from [CLAUDE.md](CLAUDE.md)). `npm run status`
writes [docs/status.md](docs/status.md), every lesson of every course with
where it stands (also at `/status.html` on the live site).

New lesson prose waits for its final Gemini copy edit in each course's
`tools/review-queue.json`. `npm run review-queue` lists what is waiting;
`OPENROUTER_API_KEY=… npm run review-queue -- --run` edits and writes it all
in one batch and empties the queues (reports in each course's
`tools/copyedit-out/`; check their fact notes before committing).

A course's description on the catalog (`summary` and `subtitle` in its
`course.json`) is written against its lessons: `npm run outline -- <course>`
prints it with every lesson's title and teaches line, written or planned,
under it. After changing a course's lessons a lot, or its description, queue
the description with `{ "description": true, "added", "what", "notes"? }` in
the course's review queue (a course with no `copyedit.json` takes this entry
too). Gemini then gets the description beside that outline and the other
courses' descriptions, may rework it, and writes it back (report in
`tools/copyedit-out/description.md`). Descriptions should differ in length
and in how they open; the catalog's test refuses the stock phrases they once
shared.

In dev the catalog's links lead to course folders that only exist in a
build; use `npm run build && npm run preview` to click through the site.

## How the site fits together

- Every course is a Didactics `defineCourse` app built by `lessonApp` with
  `inSite: true`: its page registers the site's `../sw.js` and links
  `../manifest.webmanifest`, and `catalog: { href: '../' }` puts "All
  courses" at the foot of its menu.
- `tools/build-site.mjs` runs each course's own build and copies its `dist/`
  into the site's `dist/<folder>/`, leaving out the worker and manifest the
  course writes for itself. The catalog builds last, into `dist/`; its
  service worker precaches the catalog and every course's page, icons and
  poster, so the one installed app opens offline in every course. Photos,
  maps and data files are cached as they are read; each course's Settings
  page saves them all at once from the `offline.json` its build writes.
- One installed app: the manifest's `id` is still `clouds-app`, so a phone
  that had Clouds installed keeps the same app, now opening on the catalog.
- The one-file copies (`clouds.html`, `clouds-offline.html`) are still one
  per course, offered in that course's Settings; their "All courses" link goes
  to the live site.

## Adding a course

1. Put it in `courses/<folder>/` with its own `package.json` (a workspace;
   name it after the folder, with no Didactics dependency of its own) and a
   `tsconfig.json` that extends `../../tsconfig.base.json`.
2. Give it a `course.json` and set `inSite: true` in its `vite.config.ts` and
   `catalog: { href: '../' }` in its `defineCourse` call.
3. Place it on the catalog's map: add its folder and `[x, y]` to `courses` in
   `catalog/map.json` (the catalog's tests fail for a course left off).
4. Give it an icon: add it to `catalog/icons/icons.json` (a crop box on one of
   the painted sheets, or its own image) and run `npm run icons`, which writes
   its `public/icons/` set; see `catalog/icons/README.md`.
5. `npm install` at the root, then `npm test` and `npm run build`.

## Bridges

A bridge is a short course joining two courses, drawn on the map on the line
between them. Each is listed under `bridges` in `catalog/map.json` with a
title, a one-sentence promise and the two course folders it joins. Until it
has a `folder` it shows as in preparation; once written as a course in
`courses/<folder>/` (steps above, minus the map place), set its `folder` and
it opens like any other course, with its own save and review cards.

## Encyclopedia

`encyclopedia/` holds one encyclopedia for the whole site, a JSON file per
course (`geology.json`): short entries on the ideas, people, places and
things the lessons rest on, and the course's own page, its one-page glossary
(key people, ideas, things and reference tables). Every course that turns it
on (`encyclopedia` in its vite.config.ts and main.ts) bundles all of it, so an
entry can send a reader to a lesson in any course. Lesson text links to an
entry with `[[deep time]]` (by title or other name) or `[[words|@entry-id]]`.
The format and the voice are in Didactics' README; catalog/test/encyclopedia.test.ts
checks every link and that each entry is linked from some lesson. New prose
goes on `tools/encyclopedia-review-queue.json` for the Gemini pass
(`npm run review-queue`). A course's file can be revised in its downloaded
course file and put back with `npx didactics-course import course.json --map
encyclopedia/=../../encyclopedia/`.

## Deploy

Pushes to `main` test, build and deploy the whole site to GitHub Pages
(`.github/workflows/pages.yml`).
