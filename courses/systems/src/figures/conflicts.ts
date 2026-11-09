// Lesson 13, The item that came back: a cart edited on both sides of a
// partition and merged by four rules (last writer wins, siblings with vector
// clocks, a union, and an observed-remove set); and two people editing one
// word, applied naively, by operational transformation, and as a CRDT.

import { svg } from 'didactics/dom';
import { sequenceView, type Lane, type Mark, type Message } from 'sysdiagram/sequence';
import { SEQUENCE } from './diagram';
import { COL, figure, frame, named, pick, player, slider } from './kit';

const W = 420;

// ---------------------------------------------------------------- clocks

export type Clock = Readonly<Record<string, number>>;
export type Order = 'before' | 'after' | 'equal' | 'concurrent';

/** How version clock `a` stands to `b`: before it, after it, equal, or concurrent (neither saw the other). */
export function compareClocks(a: Clock, b: Clock): Order {
  let less = false;
  let more = false;
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const x = a[k] ?? 0;
    const y = b[k] ?? 0;
    if (x < y) less = true;
    if (x > y) more = true;
  }
  return less && more ? 'concurrent' : less ? 'before' : more ? 'after' : 'equal';
}

/** The element-wise maximum: the clock of a version that has seen both. */
export const joinClocks = (a: Clock, b: Clock): Clock => {
  const out: Record<string, number> = { ...a };
  for (const [k, v] of Object.entries(b)) out[k] = Math.max(out[k] ?? 0, v);
  return out;
};

export const showClock = (c: Clock) => `[${Object.entries(c).map(([k, v]) => `${k}${v}`).join(' ')}]`;

// ---------------------------------------------------------------- an observed-remove set

/** Each add carries a unique tag; a remove deletes the tags it has seen. */
export interface ORSet {
  adds: ReadonlyArray<{ tag: string; item: string }>;
  removed: ReadonlyArray<string>;
}

export const orItems = (s: ORSet) => [...new Set(s.adds.filter((a) => !s.removed.includes(a.tag)).map((a) => a.item))].sort();
export const orAdd = (s: ORSet, item: string, tag: string): ORSet => ({ adds: [...s.adds, { tag, item }], removed: s.removed });
export const orRemove = (s: ORSet, item: string): ORSet => ({ adds: s.adds, removed: [...s.removed, ...s.adds.filter((a) => a.item === item).map((a) => a.tag)] });
export const orMerge = (a: ORSet, b: ORSet): ORSet => ({
  adds: [...a.adds, ...b.adds.filter((x) => !a.adds.some((y) => y.tag === x.tag))],
  removed: [...new Set([...a.removed, ...b.removed])],
});

// ---------------------------------------------------------------- the cart

export const RULES = ['Last writer wins', 'Keep both', 'Union', 'Add and remove sets'] as const;
export type Rule = (typeof RULES)[number];

export interface Merged {
  /** The cart after the merge, or null when both versions are kept for the application. */
  cart: string[] | null;
  /** The versions handed back, when the rule keeps both. */
  siblings: string[][];
  /** Items the customer added that are gone. */
  lost: string[];
  /** Items the customer removed that are back. */
  back: string[];
}

/**
 * The cart holds a book. During a partition, the phone adds a kettle through
 * replica X while the laptop removes the book through replica Y. What does
 * each rule make of the two versions when the replicas meet?
 */
export function mergeCart(rule: Rule): Merged {
  const start: ORSet = { adds: [{ tag: 'X1', item: 'book' }], removed: [] };
  const atX = orAdd(start, 'kettle', 'X2');
  const atY = orRemove(start, 'book');
  const want = ['kettle'];
  const judge = (cart: string[]): Merged => ({
    cart,
    siblings: [],
    lost: want.filter((i) => !cart.includes(i)),
    back: cart.filter((i) => !want.includes(i)),
  });
  switch (rule) {
    case 'Last writer wins':
      // Y's write carries the later timestamp, so its whole version wins.
      return judge(orItems(atY));
    case 'Keep both':
      return { cart: null, siblings: [orItems(atX), orItems(atY)], lost: [], back: [] };
    case 'Union':
      return judge([...new Set([...orItems(atX), ...orItems(atY)])].sort());
    case 'Add and remove sets':
      return judge(orItems(orMerge(atX, atY)));
  }
}

const list = (items: string[]) => (items.length ? `{${items.join(', ')}}` : '{ }');

export interface SeqRun {
  lanes: Lane[];
  messages: Message[];
  marks: Mark[];
  story: { at: number; text: string }[];
  tMax: number;
}

export const CART_T = 480;

export function cartRun(rule: Rule): SeqRun {
  const lanes: Lane[] = [
    { id: 'phone', label: 'Phone' },
    { id: 'X', label: 'Replica X' },
    { id: 'Y', label: 'Replica Y' },
    { id: 'laptop', label: 'Laptop' },
  ];
  const vc = rule === 'Keep both';
  const ts = rule === 'Last writer wins';
  const or = rule === 'Add and remove sets';
  const tag = (s: string, clock: string, stamp: string, tags: string) => (or ? tags : `${s}${vc ? ` ${clock}` : ts && stamp ? ` ${stamp}` : ''}`);
  const m = (from: string, to: string, send: number, arrive: number, label: string | undefined, color: string, lost = false): Message => ({ from, to, send, arrive, label, color, lost });
  const res = mergeCart(rule);
  const after = res.cart ? list(res.cart) : res.siblings.map(list).join(' and ');
  const good = res.cart !== null && !res.lost.length && !res.back.length;
  const messages: Message[] = [
    m('phone', 'X', 70, 100, 'add kettle', COL.write),
    m('laptop', 'Y', 60, 130, 'remove book', COL.write),
    m('X', 'Y', 150, 180, undefined, COL.write, true),
    m('X', 'Y', 280, 310, undefined, COL.write),
    m('Y', 'X', 280, 310, undefined, COL.write),
    m('phone', 'X', 370, 400, 'get cart', COL.request),
    m('X', 'phone', 400, 430, after, good ? COL.answer : COL.error),
  ];
  const marks: Mark[] = [
    { lane: 'X', at: 10, text: tag('{book}', '[X1]', '', 'book·X1'), color: COL.ink },
    { lane: 'Y', at: 10, text: tag('{book}', '[X1]', '', 'book·X1'), color: COL.ink },
    { lane: 'X', at: 40, text: 'partition', color: COL.error },
    { lane: 'X', at: 100, text: tag('{book, kettle}', '[X2]', 'at .100', '+kettle·X2'), color: COL.write },
    { lane: 'Y', at: 130, text: tag('{ }', '[X1 Y1]', 'at .130', '−book·X1'), color: COL.write },
    { lane: 'X', at: 260, text: 'healed', color: COL.answer },
    { lane: 'Y', at: 330, text: res.cart ? list(res.cart) : 'two versions', color: good ? COL.answer : res.cart ? COL.error : COL.clock },
    { lane: 'phone', at: 430, text: good ? 'right' : res.cart ? (res.lost.length ? 'kettle lost' : 'book is back') : 'merge them', color: good ? COL.answer : res.cart ? COL.error : COL.clock },
  ];
  const ending: Record<Rule, string> = {
    'Last writer wins': 'Y’s version has the later timestamp, so it replaces X’s whole cart. The kettle the customer added is gone, and nobody is told.',
    'Keep both': 'The clocks [X2] and [X1 Y1] are concurrent: neither has seen the other. Dynamo keeps both and returns both on the next read; the application must merge them.',
    Union: 'The cart service merged the two versions by taking every item in either. The kettle is kept, and the book the customer removed is back.',
    'Add and remove sets': 'The merge keeps every add and every remove: the remove named the book’s add (X1), and the kettle’s add (X2) was never removed. The cart is {kettle}, as the customer meant.',
  };
  const story = [
    { at: 0, text: 'The cart holds a book, on both replicas. Each replica will accept writes on its own.' },
    { at: 40, text: 'A network partition: X and Y cannot reach each other. Both stay up and keep taking writes.' },
    { at: 100, text: `On the phone, the customer adds a kettle through X.${vc ? ' X counts its own write: [X2].' : ts ? ' X stamps it with its clock.' : or ? ' The add carries a tag, X2, that no other add has.' : ''}` },
    { at: 130, text: `On the laptop, the customer removes the book through Y.${vc ? ' Y has seen X’s first write, so its clock is [X1 Y1].' : ts ? ' Y stamps it with its clock, 30 ms later.' : or ? ' The remove names the tag of the add it saw: X1.' : ''}` },
    { at: 150, text: 'X tries to send its version to Y. The message is lost in the partition.' },
    { at: 260, text: 'The partition heals. Each replica sends its version to the other.' },
    { at: 310, text: `${rule}: ${ending[rule]}` },
  ];
  return { lanes, messages, marks, story, tMax: CART_T };
}

// ---------------------------------------------------------------- one word, two editors

export const MODES = ['Apply as sent', 'Transform', 'CRDT'] as const;
export type Mode = (typeof MODES)[number];

export type Op = { kind: 'insert'; at: number; ch: string } | { kind: 'delete'; at: number };

export function applyOp(text: string, op: Op): string {
  return op.kind === 'insert' ? text.slice(0, op.at) + op.ch + text.slice(op.at) : text.slice(0, op.at) + text.slice(op.at + 1);
}

/**
 * Operational transformation: rewrite `op` so it means the same after
 * `done`, made at the same time, has been applied. On a tie between two
 * inserts, `first` says whose goes first.
 */
export function transform(op: Op, done: Op, first = true): Op | null {
  if (done.kind === 'insert') {
    if (done.at < op.at || (done.at === op.at && !(op.kind === 'insert' && first))) return { ...op, at: op.at + 1 };
    return op;
  }
  if (done.at < op.at) return { ...op, at: op.at - 1 };
  if (done.at === op.at && op.kind === 'delete') return null; // both deleted the same letter
  return op;
}

/** A sequence CRDT: every letter has an id that never changes; an insert names the letter it follows, a delete names its letter. */
export interface Letter {
  id: string;
  ch: string;
  gone: boolean;
}
export type CrdtOp = { kind: 'insert'; after: string; id: string; ch: string } | { kind: 'delete'; id: string };

export function applyCrdt(doc: readonly Letter[], op: CrdtOp): Letter[] {
  const out = doc.map((l) => ({ ...l }));
  if (op.kind === 'delete') {
    const l = out.find((x) => x.id === op.id);
    if (l) l.gone = true;
    return out;
  }
  let i = op.after === '' ? 0 : out.findIndex((x) => x.id === op.after) + 1;
  // Concurrent inserts after the same letter go in id order, the same everywhere.
  while (i < out.length && out[i].id > op.id) i++;
  out.splice(i, 0, { id: op.id, ch: op.ch, gone: false });
  return out;
}
export const crdtText = (doc: readonly Letter[]) => doc.filter((l) => !l.gone).map((l) => l.ch).join('');

/** Alice inserts h into "cart" at 1, making "chart"; Bob at the same time deletes the t, making "car". Each then applies the other's edit. */
export function editRun(mode: Mode): SeqRun & { alice: string; bob: string } {
  const start = 'cart';
  const aOp: Op = { kind: 'insert', at: 1, ch: 'h' };
  const bOp: Op = { kind: 'delete', at: 3 };
  const aMine = applyOp(start, aOp);
  const bMine = applyOp(start, bOp);
  let alice: string;
  let bob: string;
  let aLabel = 'insert h at 1';
  let bLabel = 'delete at 3';
  let aNote = '';
  let bNote = '';
  if (mode === 'Apply as sent') {
    alice = applyOp(aMine, bOp);
    bob = applyOp(bMine, aOp);
  } else if (mode === 'Transform') {
    const b2 = transform(bOp, aOp);
    const a2 = transform(aOp, bOp);
    alice = b2 ? applyOp(aMine, b2) : aMine;
    bob = a2 ? applyOp(bMine, a2) : bMine;
    aNote = b2 ? `delete at ${b2.at}` : 'nothing';
    bNote = a2 ? `insert h at ${a2.at}` : 'nothing';
  } else {
    const doc: Letter[] = [...start].map((ch, i) => ({ id: `${i + 1}`, ch, gone: false }));
    const ins: CrdtOp = { kind: 'insert', after: '1', id: 'a1', ch: 'h' };
    const del: CrdtOp = { kind: 'delete', id: '4' };
    alice = crdtText(applyCrdt(applyCrdt(doc, ins), del));
    bob = crdtText(applyCrdt(applyCrdt(doc, del), ins));
    aLabel = 'insert h after c';
    bLabel = 'delete the t';
  }
  const same = alice === bob;
  const m = (from: string, to: string, send: number, arrive: number, label: string, color: string): Message => ({ from, to, send, arrive, label, color });
  const lanes: Lane[] = [
    { id: 'alice', label: 'Alice' },
    { id: 'bob', label: 'Bob' },
  ];
  const messages: Message[] = [m('alice', 'bob', 60, 210, aLabel, COL.write), m('bob', 'alice', 110, 260, bLabel, COL.write)];
  const marks: Mark[] = [
    { lane: 'alice', at: 10, text: start, color: COL.ink },
    { lane: 'bob', at: 10, text: start, color: COL.ink },
    { lane: 'alice', at: 60, text: aMine, color: COL.write },
    { lane: 'bob', at: 110, text: bMine, color: COL.write },
    { lane: 'alice', at: 260, text: aNote ? `as ${aNote}: ${alice}` : alice, color: same ? COL.answer : COL.error },
    { lane: 'bob', at: 210, text: bNote ? `as ${bNote}: ${bob}` : bob, color: same ? COL.answer : COL.error },
  ];
  const how: Record<Mode, string> = {
    'Apply as sent': `Each applies the other’s edit at the position it was sent with. Position 3 meant the t in "cart", but in Alice’s "chart" it is the r. Alice has "${alice}", Bob has "${bob}", and neither knows.`,
    Transform: `Each edit is rewritten against the one already applied: Alice’s h went in before position 3, so Bob’s delete moves to 4; Bob’s delete came after position 1, so Alice’s insert stays. Both have "${alice}".`,
    CRDT: `Every letter has an id that never changes, so an edit names letters, not positions: "insert h after the c", "delete the t". Applied in either order, both have "${alice}".`,
  };
  const story = [
    { at: 0, text: 'Alice and Bob both have the word "cart" open. Each edit is applied at once on the editor’s own screen, then sent to the other.' },
    { at: 60, text: 'Alice types h after the c: "chart".' },
    { at: 110, text: 'A moment later Bob deletes the t: "car". Neither has seen the other’s edit.' },
    { at: 210, text: 'Alice\u2019s edit reaches Bob first.' },
    { at: 260, text: how[mode] },
  ];
  return { lanes, messages, marks, story, tMax: 300, alice, bob };
}

// ---------------------------------------------------------------- figures

function seqFigure(goal: string, h: number, names: readonly string[], build: (i: number) => SeqRun, seconds: number, isDone: (i: number) => boolean, label: string) {
  return figure([goal], (ctx, t) => {
    const f = frame(W, h, 3);
    const g = svg('g');
    f.svg.append(g);
    let at = 0;
    let run = build(at);
    let now = 0;
    let view = sequenceView(g, { x: 0, y: 0, w: W, h, lanes: run.lanes, tMax: run.tMax, colors: SEQUENCE });
    const show = () => {
      view.draw(run.messages, run.marks, now);
      const step = [...run.story].reverse().find((s) => s.at <= now);
      f.readout.textContent = step ? step.text : run.story[0].text;
      if (t.goal === goal && isDone(at) && now >= run.tMax - 10) t.done();
    };
    const time = slider('Time', 0, build(0).tMax, 2, 0, (v) => `${Math.round(v)} ms`, (v) => { now = v; show(); }, 'clock');
    const choose = named(pick(names, 0, (i) => {
      at = i;
      run = build(i);
      g.replaceChildren();
      view = sequenceView(g, { x: 0, y: 0, w: W, h, lanes: run.lanes, tMax: run.tMax, colors: SEQUENCE });
      show();
    }), label);
    f.controls.append(choose.node, player(time, ctx, { seconds }).node, time.node);
    show();
    return f.node;
  });
}

export const FIGS = {
  'conflicts-cart': seqFigure('kept', 380, RULES, (i) => cartRun(RULES[i]), 14, (i) => RULES[i] === 'Add and remove sets', 'Merge by:'),
  'conflicts-edit': seqFigure('converge', 300, MODES, (i) => editRun(MODES[i]), 10, (i) => MODES[i] !== 'Apply as sent', 'Edits:'),
};
