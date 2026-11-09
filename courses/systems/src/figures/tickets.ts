// Lesson D4, Fourteen million people, two million tickets: the estimate for a
// big on-sale, a waiting room in front of the seat service, and two buyers
// racing for one seat with a plain read-then-write, a conditional write, and
// a hold that runs out.

import { sequenceView, type Lane, type Mark, type Message } from 'sysdiagram/sequence';
import { count } from 'sysdiagram/numbers';
import { liveDiagram, SEQUENCE, System as SystemClass, type LinkSpec, type PartSpec, type System } from './diagram';
import { COL, figure, frame, named, pick, player, slider } from './kit';
import { estimateFigure } from './limiter';

// ---------------------------------------------------------------------------
// The estimate.

export interface SaleSize {
  perSeat: number;
  refused: number;
  /** Requests a second if everyone refreshes the seat map every `refresh` seconds. */
  refreshRate: number;
  /** Seats that must be sold a second to finish in `hours`. */
  salesRate: number;
  /** Seats held at once, with holds of `holdMin` minutes. */
  held: number;
}

export function saleSize(people: number, seats: number, hours: number, refresh: number, holdMin = 10): SaleSize {
  const salesRate = seats / (hours * 3600);
  return { perSeat: people / seats, refused: Math.max(0, people - seats), refreshRate: people / refresh, salesRate, held: salesRate * holdMin * 60 };
}

// ---------------------------------------------------------------------------
// The waiting room.

/** The seat service: 8 workers at 50 ms a checkout step, about 160 a second. */
export const SEAT_CAPACITY = 160;

function roomSpec(room: boolean, fans: number, admit: number): { parts: PartSpec[]; links: LinkSpec[]; seed: number } {
  const parts: PartSpec[] = [
    { id: 'fans', kind: 'client', label: 'Fans', x: 60, y: 110, rps: fans, timeoutMs: room ? 600_000 : 3000, retries: room ? 0 : 2, backoffMs: 200, keys: 2000 },
    { id: 'seats', kind: 'server', label: 'Seat service', x: 380, y: 110, serviceMs: 50, servers: 8 },
    { id: 'db', kind: 'db', label: 'Seats table', x: 520, y: 110, serviceMs: 3, servers: 16 },
  ];
  const links: LinkSpec[] = [];
  if (room) {
    parts.push({ id: 'room', kind: 'queue', label: 'Waiting room', x: 220, y: 110, servers: 1, serviceMs: 1000 / admit });
    links.push({ from: 'fans', to: 'room', ms: 30 }, { from: 'room', to: 'seats', ms: 25 });
  } else {
    links.push({ from: 'fans', to: 'seats', ms: 40 });
  }
  links.push({ from: 'seats', to: 'db', ms: 20 });
  return { parts, links, seed: 11 };
}

export interface RoomSummary {
  /** Checkouts finished well a second. */
  sold: number;
  /** Share of finished attempts that failed (errors and people giving up). */
  failed: number;
  /** Requests the fans sent a second, retries included. */
  offered: number;
  /** People in the waiting room now. */
  waiting: number;
  /** Seat service: requests waiting there now. */
  backlog: number;
  medianMs: number;
}

export function roomSummary(sys: System): RoomSummary {
  const s = sys.stats(4000);
  return {
    sold: s.goodput,
    failed: s.errors,
    offered: s.offered,
    waiting: sys.parts.has('room') ? sys.part('room').waiting.length : 0,
    backlog: sys.part('seats').waiting.length,
    medianMs: s.p50,
  };
}

/** Run the on-sale for `ms` without drawing, for tests. */
export function runRoom(room: boolean, fans: number, ms: number, admit = 140): RoomSummary {
  const sys = new SystemClass(roomSpec(room, fans, admit));
  sys.run(ms);
  return roomSummary(sys);
}

// ---------------------------------------------------------------------------
// Two buyers, one seat.

export type Race = 'naive' | 'conditional' | 'expiry';
export const RACES: readonly Race[] = ['naive', 'conditional', 'expiry'];
export const RACE_NAMES = ['Read, then write', 'Conditional write', 'A hold runs out'];

export const RACE_LANES: Lane[] = [
  { id: 'a', label: 'Buyer A' },
  { id: 's1', label: 'Server 1' },
  { id: 'db', label: 'Seats table' },
  { id: 's2', label: 'Server 2' },
  { id: 'b', label: 'Buyer B' },
];

export interface RaceTimeline {
  messages: Message[];
  marks: Mark[];
  tMax: number;
  /** Buyers told they have seat 14C at the end. */
  owners: number;
}

/** Two buyers click seat 14C at the same moment, through two servers. Times in ms, except the hold, which is minutes squeezed. */
export function raceTimeline(r: Race): RaceTimeline {
  const m: Message[] = [];
  const k: Mark[] = [];
  const send = (from: string, to: string, at: number, ms: number, label: string, color: string = COL.request, lost = false) => {
    m.push({ from, to, send: at, arrive: at + ms, label, color, lost });
    return at + ms;
  };
  let owners = 0;
  const a1 = send('a', 's1', 0, 40, 'take 14C');
  const b1 = send('b', 's2', 30, 40, 'take 14C');
  if (r === 'naive') {
    let a = send('s1', 'db', a1, 20, 'read 14C');
    let b = send('s2', 'db', b1, 20, 'read 14C');
    a = send('db', 's1', a, 20, 'free', COL.data);
    b = send('db', 's2', b, 20, 'free', COL.data);
    a = send('s1', 'db', a + 10, 20, 'write: A', COL.write);
    b = send('s2', 'db', b + 10, 20, 'write: B', COL.write);
    k.push({ lane: 'db', at: a, text: 'A', color: COL.write });
    k.push({ lane: 'db', at: b, text: 'B, over A', color: COL.error });
    a = send('db', 's1', a + 15, 20, 'ok', COL.answer);
    b = send('db', 's2', b + 15, 20, 'ok', COL.answer);
    a = send('s1', 'a', a, 40, 'yours', COL.answer);
    b = send('s2', 'b', b, 40, 'yours', COL.answer);
    k.push({ lane: 'a', at: a, text: 'pays', color: COL.error });
    k.push({ lane: 'b', at: b, text: 'pays', color: COL.error });
    owners = 2;
    return { messages: m, marks: k, tMax: 300, owners };
  }
  // Conditional: set the holder only if there is none, or the hold has expired.
  let a = send('s1', 'db', a1, 20, 'hold if free');
  let b = send('s2', 'db', b1, 20, 'hold if free');
  k.push({ lane: 'db', at: a, text: 'A holds', color: COL.clock });
  a = send('db', 's1', a + 15, 20, '1 row', COL.answer);
  b = send('db', 's2', b + 15, 20, '0 rows', COL.error);
  a = send('s1', 'a', a, 40, 'held 10 min', COL.answer);
  b = send('s2', 'b', b, 40, 'taken', COL.error);
  k.push({ lane: 'b', at: b, text: 'next seat', color: COL.soft });
  if (r === 'conditional') {
    k.push({ lane: 'a', at: a, text: 'paying', color: COL.clock });
    let p = send('a', 's1', a + 60, 40, 'paid');
    p = send('s1', 'db', p, 20, 'sell if A holds', COL.write);
    k.push({ lane: 'db', at: p, text: 'sold to A', color: COL.write });
    p = send('db', 's1', p + 20, 20, '1 row', COL.answer);
    p = send('s1', 'a', p, 40, 'ticket', COL.answer);
    owners = 1;
    return { messages: m, marks: k, tMax: 450, owners };
  }
  // A walks away; the hold expires and B's next try wins.
  k.push({ lane: 'a', at: a + 10, text: 'closes the tab', color: COL.soft });
  k.push({ lane: 'db', at: 250, text: 'A\'s hold expires', color: COL.clock });
  let c = send('b', 's2', 280, 40, 'take 14C');
  c = send('s2', 'db', c, 20, 'hold if free');
  k.push({ lane: 'db', at: c, text: 'B holds', color: COL.clock });
  c = send('db', 's2', c + 20, 20, '1 row', COL.answer);
  c = send('s2', 'b', c, 40, 'held 10 min', COL.answer);
  owners = 1;
  return { messages: m, marks: k, tMax: 450, owners };
}

export const FIGS = {
  'tickets-estimate': estimateFigure({
    inputs: [
      { key: 'people', label: 'People who show up', min: 1e6, max: 5e7, value: 14e6, log: true, show: (v) => count(v), color: 'request' },
      { key: 'seats', label: 'Seats on sale', min: 1e5, max: 1e7, value: 2e6, log: true, show: (v) => count(v), color: 'data' },
      { key: 'hours', label: 'Hours the sale runs', min: 1, max: 24, value: 4, show: (v) => `${v} h`, color: 'clock' },
    ],
    rows: (v) => {
      const s = saleSize(v.people, v.seats, v.hours, 5);
      return [
        { label: 'People for each seat', say: s.perSeat.toFixed(1), how: `${count(v.people)} ÷ ${count(v.seats)}`, color: 'request' },
        { label: 'People who must be told no', say: count(s.refused), how: 'everyone without a seat', color: 'error' },
        { label: 'Requests a second if all refresh every 5 s', say: `${count(s.refreshRate)} a second`, how: `${count(v.people)} ÷ 5 s`, color: 'busy' },
        { label: 'Seats sold a second', say: `${count(s.salesRate)} a second`, how: `${count(v.seats)} ÷ (${v.hours} h × 3,600 s)`, color: 'answer' },
        { label: 'Seats on hold at once, 10-minute holds', say: count(s.held), how: `${count(s.salesRate)} a second × 600 s`, color: 'clock' },
      ];
    },
    ask: 'Two million seats are sold over about four hours. About how many seats must be sold each second?',
    options: ['About 140', 'About 1,400', 'About 14,000', 'About 140,000'],
    answer: 0,
    after: (v) => {
      const s = saleSize(v.people, v.seats, v.hours, 5);
      return `Selling takes ${count(s.salesRate)} seats a second. Letting everyone refresh would take ${count(s.refreshRate)} requests a second, ${count(s.refreshRate / s.salesRate)} for each seat sold.`;
    },
  }),

  'tickets-room': figure(['calm'], (ctx, t) => {
    let room = false;
    let fans = 200;
    const admit = 140;
    let busy = 0;
    const d = liveDiagram(ctx, roomSpec(room, fans, admit), {
      w: 600, h: 210, lines: 3, speed: 200,
      onFrame: (sys) => {
        const s = roomSummary(sys);
        const seat = sys.part('seats');
        busy += (seat.busy / seat.servers - busy) * 0.05;
        d.f.readout.textContent = [
          `Seat service ${Math.round(busy * 100)}% busy, ${count(s.backlog)} waiting inside it; ${count(s.sold)} checkout steps a second finished.`,
          room ? `${count(s.waiting)} fans in the waiting room, each told their place in line.` : `Fans send ${count(s.offered)} requests a second, retries included.`,
          `${Math.round(s.failed * 100)}% of attempts failed or gave up${Number.isFinite(s.medianMs) ? `; median ${(s.medianMs / 1000).toFixed(1)} s to the seat page` : ''}.`,
        ].join('\n');
      },
    });
    d.f.readout.style.whiteSpace = 'pre-line';
    const goal = () => {
      if (room && fans >= 400) t.done();
    };
    const mode = named(pick(['Straight to the seats', 'Through a waiting room'], 0, (i) => { room = i === 1; d.rebuild(roomSpec(room, fans, admit)); goal(); }), 'Front door:');
    const rate = slider('Fans arriving', 50, 1000, 10, fans, (v) => `${v} a second`, (v) => { fans = v; d.sys.setRate('fans', v); goal(); }, 'request');
    d.f.controls.append(mode.node, rate.node);
    return d.f.node;
  }),

  'tickets-race': figure(['once'], (ctx, t) => {
    const W = 560;
    const H = 330;
    const f = frame(W, H, 2);
    let which = 0;
    let tl = raceTimeline(RACES[which]);
    let view = sequenceView(f.svg, { x: 6, y: 4, w: W - 12, h: H - 8, lanes: RACE_LANES, tMax: tl.tMax, colors: SEQUENCE });
    let now = 0;
    const words = (): string => {
      if (now < tl.tMax - 1) return 'Two buyers tap seat 14C within 30 ms of each other, through different servers. Play it.';
      if (RACES[which] === 'naive') return 'Both servers read "free" before either wrote. Both buyers were told 14C is theirs, and B\'s write quietly replaced A\'s.';
      if (RACES[which] === 'conditional') return 'The database applied one conditional write and refused the other: one row changed for A, none for B.';
      return 'A never paid. The hold carried an expiry, so when it passed, B\'s conditional write found the seat free.';
    };
    const paint = () => {
      view.draw(tl.messages, tl.marks, now);
      f.readout.textContent = words();
      if (RACES[which] !== 'naive' && now >= tl.tMax - 1) t.done();
    };
    const time = slider('Time', 0, 100, 1, 0, (v) => `${v}%`, (v) => { now = (v / 100) * tl.tMax; paint(); }, 'clock');
    const play = player(time, ctx, { seconds: 8 });
    const races = named(pick(RACE_NAMES, 0, (i) => {
      which = i;
      tl = raceTimeline(RACES[i]);
      f.svg.replaceChildren();
      view = sequenceView(f.svg, { x: 6, y: 4, w: W - 12, h: H - 8, lanes: RACE_LANES, tMax: tl.tMax, colors: SEQUENCE });
      time.set(0);
    }), 'Design:');
    f.controls.append(races.node, play.node, time.node);
    paint();
    return f.node;
  }),
};
