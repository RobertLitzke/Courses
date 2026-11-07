# Course icons

Every course's icon, the catalog's own, and icons for courses not yet
written, all cut from painted sheets (and a few single images).

- `sources/`: the sheets as they were made (Gemini, 2026-11-03). Keep them;
  a new or revised icon is a new sheet or a single image dropped here.
- `icons.json`: which icon is where. Each entry names a `sheet` and a `box`
  (`[x, y, width, height]` in the sheet's pixels), or a `file` that is the
  icon alone. An entry with `to` (a course folder such as `courses/soil`, or
  `catalog`) is live: its `public/icons/` is written. One without is a
  candidate and lands in `candidates/` as `<name>.svg` and `<name>-192.png`.
- `candidates/`: icons waiting for their course. `catalog/map.json` lists
  them under `candidates` with their titles. `coming-soon` is not a course:
  it is the generic tile for a course that has no icon of its own yet.

## Making them

    npm run icons                 # everything
    npm run icons -- clouds soil  # only these
    npm run icons -- --sheet /tmp/check.png   # plus one contact sheet of every tile

`tools/process-icons.mjs` does the work. For each icon it crops the box,
trims the painted tile's soft edge, masks it to a clean rounded square, and
writes, for a live icon:

| file | what it is for |
|---|---|
| `icon.svg` | the favicon, the catalog's picture of the course, and the header mark; an SVG wrapping a 256 px WebP, so everything that expects `icons/icon.svg` (the pages, Didactics' build that inlines it into the one-file copy, the catalog's registry) keeps working |
| `favicon-32.png` | the tab icon for browsers that want a bitmap |
| `icon-192.png`, `icon-512.png` | the manifest's icons, rounded with clear corners |
| `icon-512-maskable.png` | full bleed, the tile at 80% over a blurred copy of itself, for Android's own shapes |
| `apple-touch-icon.png` | 180 px, full bleed over the same blurred ground; iOS rounds it |

## Revising an icon

1. Put the new sheet or image in `sources/`.
2. Point the icon's entry in `icons.json` at it, with a new box if it is a
   sheet. A tile's box is the painted square without its drop shadow or
   label; the script trims a little more and rounds the corners itself, so
   the box need not be exact to the pixel.
3. `npm run icons -- <name> --sheet /tmp/check.png` and look at the sheet.
4. Commit the sources, `icons.json` and the written icons together. The file
   names do not change, and the service worker lists each by content, so an
   installed app picks the new icons up with its next update; a phone's home
   screen icon follows when the browser next checks the manifest.

## Adding a course's icon

Add an entry with `to: "courses/<folder>"` and run `npm run icons`. The
course's `course.json` names `public/icons/icon.svg`, its `index.html` links
`icon.svg`, `favicon-32.png` and `apple-touch-icon.png`, and its header mark is
`el('img', { src: 'icons/icon.svg', alt: '' })`, as the other courses do.
