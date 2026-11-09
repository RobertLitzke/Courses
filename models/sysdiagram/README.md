# sysdiagram

System diagrams for live lesson figures: boxes for clients, balancers,
servers, caches, databases, queues and workers joined by links, with
requests that move along the links as dots, queues that back up under
load, and parts and links that the reader can fail with a tap. Beside it,
a message timeline for protocols between nodes, a consistent-hashing ring,
queueing formulas, the numbers for estimates, and a small live line chart.
Used by Systems at Scale; it names no course, and a course passes in its
own colours.

- `model.ts`: the simulation (`System`), no DOM. Parts (`PartSpec`) have a
  `kind` (how they are drawn), a number of `servers` working at once, a
  mean `serviceMs`, an optional `queue` limit, and a `policy` for passing a
  request on: `serve` (answer it), `spread` (round robin, random or least
  loaded over the parts behind), `hash` (by key, `key mod n` or a ring
  function), `failover` (first target that is up), `cache` (answer a share
  `hit` of requests, or those `hot(key)` says are held, and pass the rest
  on), `fanout` (ask every target, answer once `need` have answered: a
  quorum or a scatter and gather) and `async` (answer at once, pass a copy
  on: a queue or log). A client part has `rps`, `keys` and Zipf `skew`,
  `timeoutMs`, `retries` and `backoffMs`. A part with `health: true` skips
  targets that are down; without it, it keeps sending to them and the
  requests time out. Links have a one-way delay `ms`. `setUp`, `setLink`
  and `setRate` change it while it runs; `run(ms)` steps the clock;
  `stats(windowMs)` gives goodput, error share and p50/p99 latency;
  `hooks.serve` and `hooks.done` let a course count what it needs (writes
  per replica, stale reads).
- `view.ts`: `systemView(sys, svgOrGroup, { colors, tap, groups, sub, fixed })`
  draws it and returns `draw()`; shapes by kind (cylinders for stores,
  slotted boxes for queues, dashed boxes for caches, a heavy box for a
  master, pills for clients and edges), a bar for how busy each part is and
  dots for its queue. `tap: 'parts' | 'links' | 'both'` lets a tap fail and
  restore. `animateSystem` steps and redraws while the figure is on screen,
  in slow motion (`speed`, ms of system time per second on screen).
- `sequence.ts`: `sequenceView` draws lanes for nodes and messages as
  arrows down the page in time, drawn up to a moment `now`, so a protocol
  plays out step by step; lost messages stop half way with a cross; marks
  note what a node did. The course works out the messages (Raft, two-phase
  commit, a quorum read); this only draws them.
- `ring.ts`: `Ring` (consistent hashing with virtual nodes: `owner`,
  `replicas`, `shares`), `moved` and `modulo` to compare how many keys move.
- `queueing.ts`: M/M/1 and M/M/c times, Erlang C, Little's law, and the
  chance a fan-out of n hits a slow reply.
- `numbers.ts`: rough costs of operations (`COSTS`, in nanoseconds), and
  `bytes`, `duration`, `count`, `rate` for readouts.
- `chart.ts`: `lineChart` (axes, ticks, series, dashed marks) and `History`
  (the last n samples of a few numbers).

## What it models, and what it leaves out

Requests arrive at random (Poisson) and service times are exponential
around their mean unless `exact` is set, so queues behave like real ones
and the tail grows as a part nears full load. A request is worked on once
at each part, then passed on or answered; an answer travels back along the
same links. A failed part drops what it holds and answers nothing, so
callers find out only by timing out, unless they check health. Answers
from a fan-out are counted as they come; a part that waits too long gives
up after its own `timeoutMs`.

It leaves out bandwidth (a link is a delay, not a pipe that fills), CPU
shared between parts, connection set-up, and any data: a request is a key,
not a payload. A course that needs stored values, versions or a log keeps
them itself through the hooks. Times are the system's own milliseconds;
figures run them slowed down and say so.

## Tests

`npm test` here (vitest; the view tests use happy-dom).
