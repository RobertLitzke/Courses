# sandtable

A sand table for live lesson figures: a grid of ground heights with water on
it. Rain and rivers add water, the water runs downhill from cell to cell, and
where it runs fast it picks up sand and where it slows it drops it. A course
builds a table for one scene (a valley with a dam, a range of mountains, a
coast, an estuary, a plain with a rising ridge), runs it as a time lapse and
draws it in its own colours. Used by Rivers (lessons 1, 4 and 14, and the
Duwamish branch) and Geology (lesson 14).

- `table.ts`: the model (`Table`), a scrubbable replay (`Replay`) and a smooth
  random field for terrain (`noise`). No DOM.
- `view.ts`: draws a table on a canvas, lit from the north-west, with an SVG
  over it for labels (`tableView`).
- `lapse.ts`: a table as a lesson figure's time lapse, a time slider with a
  Play button (`sandLapse`), plus `laidDown` and `mixHex`.

## What it models

Water moves by the virtual-pipe method (Mei, Decaudin and Hu, 2007): each
pair of neighbouring cells is joined by a pipe whose flow speeds up with the
difference in water level across it, with friction that holds shallow water
back more than deep. Sand, salt and dye ride along the pipes with the water.
Water faster than a starting speed can carry sand in proportion to its depth
and its extra speed: it takes sand from the bed when it carries less than
that and drops sand when it carries more. Slopes steeper than a set angle
slump.

Optional pieces, each off unless a scene turns it on:

- a sea, held at a level along chosen cells, rising and falling with a tide;
- waves, which stir the shallows, drift their load along the shore, throw
  sand up the beach (swash), and wear back land standing at the water's edge;
- ground that soaks up shallow water; dams (`build`, `remove`); land that
  rises (`uplift`).

## What it leaves out

Everything is depth-averaged: the water has no layers, so a salt wedge or a
two-layer estuary is beyond it. One size of sand. No inertia of waves (they
are a stirring and a drift, not water moving up and down). Erosion and
deposition are sped up by many orders of magnitude so a valley changes in a
minute of play; a figure says "a model" and puts its own labels on time.

## Tests

`npm test` here. The courses test their own scenes (`courses/rivers/test/sandtable.test.ts`,
`courses/geology/test/saw.test.ts`).
