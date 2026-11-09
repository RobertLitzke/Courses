// Lesson 22, Charging a card exactly once: a charge whose reply is lost and
// the retry that follows, with and without an idempotency key; what the
// server keeps for each key; a double-entry ledger; and the outbox, which
// keeps a database write and the event about it from drifting apart.

import { svg } from 'didactics/dom';
import { line, redraw, small, still, label } from 'didactics/draw';
import { makeRng, type Rng } from 'didactics/rng';
import { sequenceView, type Mark, type Message } from 'sysdiagram/sequence';
import { SEQUENCE } from './diagram';
import { animate, COL, figure, frame, named, pick, player, slider, tint } from './kit';

// ---------------------------------------------------------------------------
// The retry: client, payments API, card network.

export type Lost = 'nothing' | 'request' | 'reply';

export interface RetryRun {
  messages: Message[];
  marks: Mark[];
  /** Times the card was charged. */
  charges: number;
  /** The client ended with an answer. */
  answered: boolean;
}

/** The end of the timeline, ms. */
export const RETRY_END = 1000;

/**
 * One charge of $40 from a shop's server through a payments API to the card
 * network. `lost` says which message of the first try goes missing; the
 * client times out at 600 ms and tries again at 650. With `key`, both tries
 * carry the same idempotency key and the API keeps each key's reply.
 */
export function retryRun(lost: Lost, key: boolean): RetryRun {
  const messages: Message[] = [];
  const marks: Mark[] = [];
  let charges = 0;
  const k = key ? ' (key k7)' : '';
  // The first try.
  messages.push({ from: 'client', to: 'api', send: 0, arrive: 60, label: `charge $40${k}`, color: COL.request, lost: lost === 'request' });
  let charged = false;
  if (lost !== 'request') {
    messages.push({ from: 'api', to: 'net', send: 70, arrive: 130, label: 'authorise', color: COL.request });
    marks.push({ lane: 'net', at: 130, text: 'charged $40', color: COL.write });
    charges++;
    charged = true;
    messages.push({ from: 'net', to: 'api', send: 140, arrive: 200, label: 'approved', color: COL.answer });
    if (key) marks.push({ lane: 'api', at: 205, text: 'k7: reply saved', color: COL.data });
    messages.push({ from: 'api', to: 'client', send: 210, arrive: 270, label: 'charged', color: COL.answer, lost: lost === 'reply' });
  }
  if (lost === 'nothing') {
    marks.push({ lane: 'client', at: 270, text: 'done', color: COL.answer });
    return { messages, marks, charges, answered: true };
  }
  // No reply: the client times out and tries again.
  marks.push({ lane: 'client', at: 600, text: 'no reply: retry', color: COL.busy });
  messages.push({ from: 'client', to: 'api', send: 650, arrive: 710, label: `charge $40${k}`, color: COL.request });
  if (key && charged) {
    marks.push({ lane: 'api', at: 715, text: 'k7 seen: send saved reply', color: COL.data });
    messages.push({ from: 'api', to: 'client', send: 720, arrive: 780, label: 'charged (saved)', color: COL.answer });
    marks.push({ lane: 'client', at: 780, text: 'done, charged once', color: COL.answer });
    return { messages, marks, charges, answered: true };
  }
  messages.push({ from: 'api', to: 'net', send: 720, arrive: 780, label: 'authorise', color: COL.request });
  charges++;
  marks.push({ lane: 'net', at: 780, text: charges > 1 ? 'charged again' : 'charged $40', color: charges > 1 ? COL.error : COL.write });
  messages.push({ from: 'net', to: 'api', send: 790, arrive: 850, label: 'approved', color: COL.answer });
  messages.push({ from: 'api', to: 'client', send: 860, arrive: 920, label: 'charged', color: COL.answer });
  marks.push({ lane: 'client', at: 920, text: charges > 1 ? 'done, but charged twice' : 'done, charged once', color: charges > 1 ? COL.error : COL.answer });
  return { messages, marks, charges, answered: true };
}

const retryFigure = figure(['once'], (ctx, t) => {
  const W = 470;
  const H = 330;
  const f = frame(W, H, 2);
  const seq = sequenceView(f.svg, {
    x: 0, y: 4, w: W, h: H - 8, tMax: RETRY_END, colors: SEQUENCE,
    lanes: [
      { id: 'client', label: 'Shop\'s server' },
      { id: 'api', label: 'Payments API' },
      { id: 'net', label: 'Card network' },
    ],
  });
  let lost: Lost = 'reply';
  let key = false;
  let now = 0;
  const LOSTS: Lost[] = ['nothing', 'request', 'reply'];
  const paint = () => {
    const run = retryRun(lost, key);
    seq.draw(run.messages, run.marks, now);
    const end = now >= 930;
    if (!end) {
      f.readout.textContent = now < 600
        ? lost === 'nothing' ? 'The first try goes through and the reply comes back.' : `The ${lost === 'request' ? 'request' : 'reply'} is lost on the way. The shop's server waits, and cannot tell what happened.`
        : 'Timed out. The shop\'s server sends the charge again.';
    } else if (run.charges > 1) {
      f.readout.textContent = 'The card was charged twice, $80 in all. The API had no way to know the second request was the first one again.';
    } else {
      f.readout.textContent = lost === 'reply' && key
        ? 'Charged once. The API found key k7 already done and sent back the reply it had saved, without asking the card network again.'
        : lost === 'request' ? 'Charged once: the first request never arrived, so the retry was the only charge.' : 'Charged once, with no retry needed.';
    }
    if (end && lost === 'reply' && key) t.done();
  };
  const time = slider('Time', 0, RETRY_END, 5, 0, (v) => `${Math.round(v)} ms`, (v) => { now = v; paint(); }, 'clock');
  const play = player(time, ctx, { seconds: 8 });
  const what = named(pick(['Nothing', 'The request', 'The reply'], 2, (i) => { lost = LOSTS[i]; time.set(0); paint(); }), 'Lost:');
  const keyed = named(pick(['No key', 'Idempotency key'], 0, (i) => { key = i === 1; time.set(0); paint(); }), 'Retry:');
  f.controls.append(what.node, keyed.node, play.node, time.node);
  paint();
  return f.node;
});

// ---------------------------------------------------------------------------
// What the server keeps for a key, and the phases of one request.

const keysStill = () => {
  const W = 470;
  const H = 300;
  const s = still(W, H);
  const g = svg('g');
  s.svg.append(g);
  const cols: [string, string, number][] = [
    ['key', 'k7f3…a91', 8],
    ['request fingerprint', 'sha256 of body', 72],
    ['recovery point', 'charge_created', 182],
    ['locked at', '14:02:07.410', 290],
    ['reply', '(none yet)', 380],
  ];
  const parts: SVGElement[] = [small(8, 16, 'One row of the idempotency_keys table', { bold: true })];
  parts.push(svg('rect', { x: 4, y: 24, width: W - 8, height: 46, rx: 4, fill: tint(COL.data, 0.08), stroke: COL.data, 'stroke-width': 1 }));
  for (const [head, val, x] of cols) {
    parts.push(small(x + 4, 40, head, { soft: true }), small(x + 4, 60, val, { fill: x === 182 ? COL.clock : COL.ink }));
  }
  // The phases.
  const steps: { x: number; title: string; lines: string[]; color: string }[] = [
    { x: 6, title: 'Phase 1', lines: ['one transaction:', 'insert key row,', 'charge row "pending"'], color: COL.data },
    { x: 124, title: 'Call out', lines: ['card network,', 'passing the key on;', 'no transaction open'], color: COL.request },
    { x: 242, title: 'Phase 2', lines: ['one transaction:', 'save the answer,', 'point: charge_created'], color: COL.data },
    { x: 360, title: 'Phase 3', lines: ['one transaction:', 'save the reply,', 'point: finished'], color: COL.data },
  ];
  parts.push(small(8, 104, 'One request, in steps that each end at a recovery point', { bold: true }));
  for (const [i, st] of steps.entries()) {
    parts.push(svg('rect', { x: st.x, y: 114, width: 104, height: 72, rx: 5, fill: tint(st.color, 0.1), stroke: st.color, 'stroke-width': 1.2 }));
    parts.push(small(st.x + 6, 130, st.title, { bold: true, fill: st.color }));
    st.lines.forEach((l, k) => parts.push(small(st.x + 6, 146 + k * 13, l)));
    if (i < steps.length - 1) parts.push(line(st.x + 106, 150, st.x + 116, 150, COL.soft, 1.5), svg('path', { d: `M${st.x + 118},150 l-6,-4 v8 Z`, fill: COL.soft }));
  }
  const notes = [
    'A retry that finds the key finished gets the saved reply and nothing else runs.',
    'A retry that finds it stopped at a recovery point carries on from there.',
    'A retry with the same key but a different body is refused: it is a different request.',
    'A retry while the first is still running finds the row locked and is told to try later.',
  ];
  notes.forEach((n, k) => parts.push(small(8, 214 + k * 18, `• ${n}`)));
  redraw(g, ...parts);
  return { node: s.node };
};

// ---------------------------------------------------------------------------
// A double-entry ledger.

export interface Entry {
  txn: string;
  account: string;
  /** Cents; positive is a debit, negative a credit. */
  cents: number;
}

/** Four transactions of one $40 sale: the charge, the fee, the card network settling, the payout. */
export const LEDGER: readonly Entry[] = [
  { txn: 'T1 charge', account: 'owed by card network', cents: 4000 },
  { txn: 'T1 charge', account: 'owed to merchant', cents: -4000 },
  { txn: 'T2 fee', account: 'owed to merchant', cents: 146 },
  { txn: 'T2 fee', account: 'fee income', cents: -146 },
  { txn: 'T3 settled', account: 'cash at bank', cents: 4000 },
  { txn: 'T3 settled', account: 'owed by card network', cents: -4000 },
  { txn: 'T4 payout', account: 'owed to merchant', cents: 3854 },
  { txn: 'T4 payout', account: 'cash at bank', cents: -3854 },
];

/** Each account's balance: the sum of its entries. */
export function balances(entries: readonly Entry[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const e of entries) out.set(e.account, (out.get(e.account) ?? 0) + e.cents);
  return out;
}

/** Each transaction's sum, which must be zero. */
export function txnSums(entries: readonly Entry[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const e of entries) out.set(e.txn, (out.get(e.txn) ?? 0) + e.cents);
  return out;
}

const money = (c: number) => `${c < 0 ? '−' : c > 0 ? '+' : ''}${(Math.abs(c) / 100).toFixed(2)}`;

const ledgerStill = () => {
  const W = 470;
  const rowH = 17;
  const H = 70 + LEDGER.length * rowH + 110;
  const s = still(W, H);
  const g = svg('g');
  s.svg.append(g);
  const parts: SVGElement[] = [];
  parts.push(small(8, 16, 'Entries (append only; debits +, credits −)', { bold: true }));
  parts.push(small(8, 34, 'transaction', { soft: true }), small(110, 34, 'account', { soft: true }), small(330, 34, 'amount, $', { soft: true, anchor: 'end' }));
  let y = 52;
  let last = '';
  for (const e of LEDGER) {
    if (e.txn !== last && last) parts.push(line(6, y - 12, 340, y - 12, COL.grid, 1));
    parts.push(small(8, y, e.txn === last ? '' : e.txn), small(110, y, e.account), small(330, y, money(e.cents), { anchor: 'end', fill: e.cents < 0 ? COL.write : COL.ink }));
    last = e.txn;
    y += rowH;
  }
  // Sums of each transaction.
  const sums = txnSums(LEDGER);
  let sy = 52;
  let prev = '';
  for (const e of LEDGER) {
    if (e.txn !== prev) parts.push(small(352, sy + rowH / 2, `sum ${(sums.get(e.txn)! / 100).toFixed(2)}`, { fill: COL.answer }));
    prev = e.txn;
    sy += rowH;
  }
  y += 10;
  parts.push(line(6, y - 12, W - 6, y - 12, COL.ink, 1));
  parts.push(small(8, y + 4, 'Balances, read as sums of the entries', { bold: true }));
  const b = balances(LEDGER);
  [...b.entries()].forEach(([acct, c], i) => {
    const x = i % 2 ? 240 : 8;
    const yy = y + 24 + Math.floor(i / 2) * 18;
    parts.push(small(x, yy, `${acct}: ${money(c)}`, { fill: c === 0 ? COL.soft : COL.ink }));
  });
  parts.push(small(8, y + 72, 'Every transaction sums to zero, so all the balances together sum to zero.', { fill: COL.answer }));
  redraw(g, ...parts);
  return { node: s.node };
};

// ---------------------------------------------------------------------------
// The outbox against writing, then publishing.

export type WriteMode = 'dual' | 'outbox';

export interface WriteTally {
  /** Orders committed in the database. */
  orders: number;
  /** Distinct orders the log has an event for. */
  events: number;
  /** Orders the log will never hear of. */
  missing: number;
  /** Events published more than once (a consumer drops the repeat by its ID). */
  repeats: number;
}

/**
 * What one order's write comes to. Dual write: the database commits, then
 * the app publishes; a crash between the two (chance `crash`) loses the event.
 * Outbox: the order and its event row commit in one transaction; a relay
 * publishes the event and then marks it sent, and a crash between those two
 * makes it publish again later, so the event is never lost but may repeat.
 */
export function writeOne(mode: WriteMode, crash: number, rng: Rng): { event: boolean; repeats: number } {
  if (mode === 'dual') return { event: rng() >= crash, repeats: 0 };
  let repeats = 0;
  while (rng() < crash && repeats < 20) repeats++;
  return { event: true, repeats };
}

/** `n` orders written one way, tallied. */
export function writeRun(mode: WriteMode, crash: number, n: number, seed = 1): WriteTally {
  const rng = makeRng(seed);
  const tally: WriteTally = { orders: 0, events: 0, missing: 0, repeats: 0 };
  for (let i = 0; i < n; i++) {
    const r = writeOne(mode, crash, rng);
    tally.orders++;
    if (r.event) tally.events++;
    else tally.missing++;
    tally.repeats += r.repeats;
  }
  return tally;
}

interface Token { from: [number, number]; to: [number, number]; t0: number; dur: number; color: string; then?: () => void }

const outboxFigure = figure(['outbox'], (ctx, t) => {
  const W = 470;
  const H = 230;
  const f = frame(W, H, 2);
  const g = svg('g');
  f.svg.append(g);
  const APP: [number, number] = [70, 70];
  const DB: [number, number] = [235, 70];
  const LOG: [number, number] = [405, 70];
  const RELAY: [number, number] = [320, 170];
  let mode: WriteMode = 'dual';
  let crash = 0.15;
  let clock = 0;
  let nextOrder = 300;
  let nextPoll = 0;
  let tokens: Token[] = [];
  let crashUntil = -1;
  let relayCrashUntil = -1;
  let tally: WriteTally = { orders: 0, events: 0, missing: 0, repeats: 0 };
  let pending = 0;
  const rng = makeRng(7);
  const reset = () => {
    tokens = [];
    tally = { orders: 0, events: 0, missing: 0, repeats: 0 };
    pending = 0;
    clock = 0;
    nextOrder = 300;
    nextPoll = 0;
  };
  const send = (from: [number, number], to: [number, number], dur: number, color: string, then?: () => void) =>
    tokens.push({ from, to, t0: clock, dur, color, then });
  const box = (c: [number, number], name: string, sub: string, color: string, crashed: boolean, cyl = false) => {
    const [x, y] = c;
    const out: SVGElement[] = [];
    if (cyl) {
      const w = 92, h = 46, e = 6;
      out.push(svg('path', { d: `M${x - w / 2},${y - h / 2 + e} a${w / 2},${e} 0 0 0 ${w},0 a${w / 2},${e} 0 0 0 ${-w},0 v${h - 2 * e} a${w / 2},${e} 0 0 0 ${w},0 v${-(h - 2 * e)}`, fill: tint(color, 0.12), stroke: color, 'stroke-width': 1.5 }));
    } else out.push(svg('rect', { x: x - 46, y: y - 20, width: 92, height: 40, rx: 4, fill: tint(color, 0.1), stroke: color, 'stroke-width': 1.5 }));
    out.push(label(x, y + 4, name, { anchor: 'middle' }), small(x, y + 40, sub, { anchor: 'middle', soft: true }));
    if (crashed) out.push(svg('path', { d: `M${x - 18},${y - 18} L${x + 18},${y + 18} M${x + 18},${y - 18} L${x - 18},${y + 18}`, stroke: COL.error, 'stroke-width': 3 }));
    return out;
  };
  const paint = () => {
    const parts: SVGElement[] = [];
    parts.push(line(APP[0] + 48, APP[1], DB[0] - 48, DB[1], COL.grid, 2));
    if (mode === 'dual') parts.push(svg('path', { d: `M${APP[0] + 30},${APP[1] - 22} Q${(APP[0] + LOG[0]) / 2},${-10} ${LOG[0] - 30},${LOG[1] - 22}`, fill: 'none', stroke: COL.grid, 'stroke-width': 2 }));
    else parts.push(line(DB[0] + 20, DB[1] + 24, RELAY[0] - 20, RELAY[1] - 20, COL.grid, 2), line(RELAY[0] + 30, RELAY[1] - 20, LOG[0] - 10, LOG[1] + 22, COL.grid, 2));
    parts.push(...box(APP, 'Shop app', mode === 'dual' ? 'writes, then publishes' : 'one transaction', COL.ink, clock < crashUntil));
    parts.push(...box(DB, 'Database', mode === 'dual' ? `orders: ${tally.orders}` : `orders: ${tally.orders}, outbox: ${pending}`, COL.data, false, true));
    parts.push(...box(LOG, 'Event log', `events: ${tally.events}`, COL.data, false, true));
    if (mode === 'outbox') parts.push(...box(RELAY, 'Relay', 'publish, then mark sent', COL.ink, clock < relayCrashUntil));
    for (const k of tokens) {
      const p = Math.min(1, (clock - k.t0) / k.dur);
      parts.push(svg('circle', { cx: k.from[0] + (k.to[0] - k.from[0]) * p, cy: k.from[1] + (k.to[1] - k.from[1]) * p, r: 5, fill: k.color, stroke: COL.paper, 'stroke-width': 1 }));
    }
    redraw(g, ...parts);
    const lost = tally.missing;
    f.readout.textContent = mode === 'dual'
      ? `${tally.orders} orders saved, ${tally.events} events published. ${lost ? `${lost} order${lost > 1 ? 's' : ''} the rest of the company will never hear about.` : 'None lost yet.'}`
      : `${tally.orders} orders saved, ${tally.events} published, none lost. ${tally.repeats ? `${tally.repeats} event${tally.repeats > 1 ? 's were' : ' was'} sent twice after a relay crash; consumers drop repeats by event ID.` : ''}`;
  };
  const tick = (ms: number) => {
    clock += ms;
    if (clock >= nextOrder) {
      nextOrder = clock + 900;
      const crashed = mode === 'dual' && rng() < crash;
      send(APP, DB, 450, COL.write, () => {
        tally.orders++;
        if (mode === 'outbox') pending++;
        else if (crashed) { tally.missing++; crashUntil = clock + 600; }
        else send(APP, LOG, 600, COL.write, () => { tally.events++; });
      });
    }
    if (mode === 'outbox' && clock >= nextPoll && pending > 0) {
      nextPoll = clock + 700;
      const dies = rng() < crash;
      send(DB, RELAY, 300, COL.write, () => send(RELAY, LOG, 350, COL.write, () => {
        if (dies) { tally.repeats++; relayCrashUntil = clock + 500; }
        else { tally.events++; pending = Math.max(0, pending - 1); }
      }));
    }
    const arrived = tokens.filter((k) => clock - k.t0 >= k.dur);
    tokens = tokens.filter((k) => clock - k.t0 < k.dur);
    for (const k of arrived) k.then?.();
  };
  const check = () => { if (mode === 'outbox' && crash >= 0.1) t.done(); };
  const modes = named(pick(['Write, then publish', 'Outbox'], 0, (i) => { mode = i ? 'outbox' : 'dual'; reset(); check(); paint(); }), 'Design:');
  const crashes = slider('Crashes', 0, 0.4, 0.05, crash, (v) => `${Math.round(v * 100)}% of steps`, (v) => { crash = v; check(); }, 'error');
  f.controls.append(modes.node, crashes.node);
  animate(f.svg, ctx, (dt) => { tick(dt * 1000); paint(); });
  paint();
  return f.node;
});

export const FIGS = {
  'payments-retry': retryFigure,
  'payments-keys': keysStill,
  'payments-ledger': ledgerStill,
  'payments-outbox': outboxFigure,
};
