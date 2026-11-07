# Notes for Claude sessions

## The lesson guide

The lesson guide is a Claude Doc that Rob edits in the app, not a file in
this repository: https://claude.ai/artifact/9Y8iYVPYjPyk315cFAR8CP
(doc id 4521ebe4-f5e7-4269-abbd-73fa40b15b60). Read it with the Claude Docs
tools before planning a course or writing, expanding or reworking any
lesson, and whenever Rob says "use the lesson guide". Read it fresh each
time, since Rob changes it. It is the only copy: don't copy it into the repo
or the project files. A new rule Rob asks for goes into the doc. If you have
no Claude Docs tools, say so rather than writing from memory.

## Keeping the status table current

Every lesson's status is in [docs/status.md](docs/status.md) (also
docs/status.html, and /status.html on the live site), made by
`npm run status` (tools/status.mjs).


`npm run status` writes `docs/status.md` and `docs/status.html`; the site
build writes the same page to `/status.html` on the live site. Most of it is
read from the repository: written lessons, `coming(...)` lessons, branches and
codes, the Gemini queues, parked photos, and lessons with no photos in
courses that expect them. A lesson's status is the first step it still waits
for: student read-through, Gemini, fact check, photos.

What it can't see is kept in `tools/lesson-status.json` (its `$comment`
explains each field): fact checks, read-throughs the queue doesn't mention,
stand-in images, lessons planned in an outline but not yet in
`lessons.ts`, and a plainer summary where a `teaches` line is long.

When a thread finishes work on a lesson:

- Wrote or changed prose: add it to the course's review queue.
- Added or reshaped lessons enough that the catalog description no longer
  fits: rewrite `summary` in `course.json` against `npm run outline -- <course>`
  and queue `{ "description": true, ... }` for Gemini (README, review queue).
- Ran a student read-through: if the queue entry said "no student review",
  update it, or set `"student": "done"` for the lesson in
  `tools/lesson-status.json`.
- Fact-checked: set `"facts": "done YYYY-MM-DD (where the report is)"` for
  the lesson or the course.
- Fetched photos: restore the parked blocks; for a stand-in, remove its
  `images` note.
- Planned new lessons: add them as `coming(...)` in `lessons.ts`, or under
  `planned` for an outline that isn't in code yet. A whole new course that is still
  only an outline goes in as a course key with a `title`, an `order` and its
  `planned` lessons (see `finance`).

Then run `npm run status` and commit `docs/status.md` and
`docs/status.html` with the change. The script warns about a lesson id in
`tools/lesson-status.json` that no course has.

## Course versions and beta

Each course's version and stage are in its `course.json` under `release`
(`version`, `stage`, `date`, `note`, `history`). A course is in beta (0.x)
while it is being written and checked, and released (1.0 and up) only when
Rob says so. Beta courses get a Beta stamp on the catalog shelves, a slip on
the course home saying what beta means, and every course shows its version
in Settings under About (Didactics `release`).

- Don't bump the version with every change. Bump it with
  `npm run release -- <course> "What changed"` when Rob asks, or when a
  thread finishes a sizeable batch (new lessons or branches, a review pass);
  the note shows in Settings, so write it for a reader.
- `npm run release` lists every course and what stands between each beta and
  release. The bar for asking Rob: every planned lesson written, and every
  lesson through the read-through, Gemini, fact check and photos. Only Rob
  releases a course (`--release`, 0.x to 1.0); `--major` is for 2.0 and on.
- Progress is keyed by lesson id, so a version never touches a save.
- Then `npm run status` (the table shows versions and the bar) and commit.

## Skills

`.claude/skills/` has `new-lesson`, `new-figure` and `pick-images`. Each is a
pointer: the steps are kept once, in Didactics' `.claude/skills/`, beside
Didactics' own CLAUDE.md (module layout, releasing and pinning).

## Shared models

`models/<name>/` holds simulations that more than one course runs but that
are too specific for Didactics (Rob's call, 2026-11-07): `models/sandtable`
is the water and erosion sand table used by Rivers and Geology. Each is a
workspace package with its own `test/`; it never names a course, and the
course passes in its colours and sliders. Its README says what it models and
what it leaves out.

## Elsewhere

- Layout, commands and how the site fits together: [README.md](README.md).
  The lesson format and figure library: Didactics' README.
- Pushing straight to `main` is fine; it deploys the site.
