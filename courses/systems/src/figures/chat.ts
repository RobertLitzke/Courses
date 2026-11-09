// Lesson D2, Half a billion people, a few dozen engineers: the estimate for
// a chat service, one message's path with its receipts (online, offline,
// and with a lost acknowledgement), and a workbench of delivery and storage
// choices with their load, delay and cost.

import { svg } from 'didactics/dom';
import { sequenceView, type Lane, type Mark, type Message } from 'sysdiagram/sequence';
import { count } from 'sysdiagram/numbers';
import { SEQUENCE } from './diagram';
import { COL, figure, frame, named, pick, player, slider } from './kit';
import { drawBoard, estimateFigure, type BoardBox, type BoardWire } from './limiter';

// ---------------------------------------------------------------------------
// The estimate.

export interface ChatSize {
  perDay: number;
  mean: number;
  peak: number;
  online: number;
  gateways: number;
  /** Bytes of message text a year. */
  yearBytes: number;
}

/** Messages, connections and storage for `users` people each sending `perUser` messages a day. */
export function chatSize(users: number, perUser: number, peakFactor: number, onlineShare: number, perServer: number, bytesPerMsg: number): ChatSize {
  const perDay = users * perUser;
  const mean = perDay / 86_400;
  const online = users * onlineShare;
  return { perDay, mean, peak: mean * peakFactor, online, gateways: Math.ceil(online / perServer), yearBytes: perDay * 365 * bytesPerMsg };
}

const bytesSay = (b: number) => (b >= 1e15 ? `${count(b / 1e15)} PB` : b >= 1e12 ? `${count(b / 1e12)} TB` : `${count(b / 1e9)} GB`);

// ---------------------------------------------------------------------------
// One message's path.

export type ChatCase = 'online' | 'offline' | 'lost';
export const CHAT_CASES: readonly ChatCase[] = ['online', 'offline', 'lost'];
export const CHAT_CASE_NAMES = ['Bob online', 'Bob offline', 'An ack is lost'];

export const CHAT_LANES: Lane[] = [
  { id: 'alice', label: 'Alice' },
  { id: 'gwa', label: 'Gateway A' },
  { id: 'chat', label: 'Chat' },
  { id: 'store', label: 'Store' },
  { id: 'gwb', label: 'Gateway B' },
  { id: 'bob', label: 'Bob' },
  { id: 'push', label: 'Push' },
];

export interface ChatTimeline {
  messages: Message[];
  marks: Mark[];
  tMax: number;
  /** Copies of the message Bob's phone shows at the end. */
  shown: number;
  /** Ticks Alice sees at the end: 1 sent, 2 delivered, 3 read. */
  ticks: number;
}

/** The messages for one case, times in ms. */
export function chatTimeline(c: ChatCase): ChatTimeline {
  const m: Message[] = [];
  const k: Mark[] = [];
  const send = (from: string, to: string, at: number, ms: number, label: string, color: string = COL.request, lost = false) => {
    m.push({ from, to, send: at, arrive: at + ms, label, color, lost });
    return at + ms;
  };
  // Alice sends; the conversation's owner numbers it and stores it before saying "sent".
  let t = send('alice', 'gwa', 0, 40, 'msg c7');
  t = send('gwa', 'chat', t, 20, 'c7');
  k.push({ lane: 'chat', at: t, text: 'seq 42', color: COL.clock });
  t = send('chat', 'store', t + 25, 20, 'append 42', COL.write);
  k.push({ lane: 'store', at: t, text: 'kept', color: COL.data });
  t = send('store', 'chat', t + 5, 20, 'ok', COL.answer);
  const acked = t;
  let ticks = 1;
  // When Alice's phone can next hear from the service.
  let aliceBack: number;
  if (c === 'lost') {
    const a0 = send('chat', 'gwa', acked + 5, 20, 'sent 42', COL.answer);
    send('gwa', 'alice', a0, 40, 'sent', COL.answer, true);
    k.push({ lane: 'alice', at: 250, text: 'no reply: send c7 again', color: COL.error });
    let a = send('alice', 'gwa', 260, 40, 'c7 again');
    a = send('gwa', 'chat', a, 20, 'c7');
    k.push({ lane: 'chat', at: a, text: 'c7 known: still 42', color: COL.clock });
    a = send('chat', 'gwa', a + 25, 20, 'sent 42', COL.answer);
    a = send('gwa', 'alice', a, 40, 'sent', COL.answer);
    k.push({ lane: 'alice', at: a, text: '✓', color: COL.answer });
    aliceBack = a + 10;
  } else {
    let a = send('chat', 'gwa', acked + 5, 20, 'sent 42', COL.answer);
    a = send('gwa', 'alice', a, 40, 'sent', COL.answer);
    k.push({ lane: 'alice', at: a, text: '✓', color: COL.answer });
    aliceBack = a + 10;
  }
  let d: number;
  if (c === 'offline') {
    k.push({ lane: 'chat', at: acked + 30, text: 'Bob not connected', color: COL.soft });
    d = send('chat', 'push', acked + 40, 25, 'notify');
    d = send('push', 'bob', d, 120, 'wake');
    k.push({ lane: 'bob', at: d, text: 'wakes', color: COL.ink });
    d = send('bob', 'gwb', d + 20, 40, 'have up to 41');
    d = send('gwb', 'chat', d, 20, 'after 41?');
    d = send('chat', 'store', d + 20, 20, 'read > 41');
    d = send('store', 'chat', d + 20, 20, '42', COL.data);
    d = send('chat', 'gwb', d + 15, 20, '42', COL.answer);
    d = send('gwb', 'bob', d, 40, '42', COL.answer);
  } else {
    d = send('chat', 'gwb', acked + 30, 20, '42', COL.answer);
    d = send('gwb', 'bob', d, 40, '42', COL.answer);
  }
  k.push({ lane: 'bob', at: d, text: 'shows 42', color: COL.answer });
  // Delivered: a receipt back from Bob's phone, passed on once Alice can hear it.
  d = send('bob', 'gwb', d + 15, 40, 'got 42');
  d = send('gwb', 'chat', d, 20, 'got 42');
  d = send('chat', 'gwa', Math.max(d + 5, aliceBack), 20, 'delivered', COL.answer);
  d = send('gwa', 'alice', d, 40, 'delivered', COL.answer);
  k.push({ lane: 'alice', at: d, text: '✓✓', color: COL.answer });
  ticks = 2;
  if (c !== 'offline') {
    d = send('bob', 'gwb', d + 40, 40, 'read 42');
    d = send('gwb', 'chat', d, 20, 'read 42');
    d = send('chat', 'gwa', d + 5, 20, 'read', COL.answer);
    d = send('gwa', 'alice', d, 40, 'read', COL.answer);
    k.push({ lane: 'alice', at: d, text: 'read', color: COL.request });
    ticks = 3;
  }
  // Bob's phone shows message 42 once in every case: the resend carried the same id.
  return { messages: m, marks: k, tMax: Math.ceil((d + 30) / 50) * 50, shown: 1, ticks };
}

// ---------------------------------------------------------------------------
// The workbench.

export interface ChatChoices {
  /** Seconds between polls, or 0 for a held connection. */
  poll: number;
  /** Connections one gateway server holds. */
  perServer: number;
  /** Members of an average group. */
  groupSize: number;
  /** Store one copy per member (true) or one per conversation. */
  copyPerMember: boolean;
}

export const CHAT_USERS = 500e6;
export const CHAT_ONLINE = 0.3;
export const CHAT_PEAK_MSGS = 600_000;
/** Share of messages sent to groups. */
export const GROUP_SHARE = 0.3;
/** A month of a server, in round dollars. */
export const SERVER_MONTH = 400;

export interface ChatLoad {
  /** Requests a second the gateways take from phones. */
  gatewayIn: number;
  /** Median delay from send to Bob's phone, ms. */
  delayMs: number;
  servers: number;
  costMonth: number;
  /** Rows written to the store a second. */
  storeWrites: number;
  /** Messages pushed down open connections a second. */
  deliveries: number;
  /** Phones that reconnect when one gateway dies. */
  dropped: number;
}

/** The peak load for a design: 500 million users, 30% online, 600,000 messages a second sent. */
export function chatLoad(o: ChatChoices): ChatLoad {
  const online = CHAT_USERS * CHAT_ONLINE;
  const recipients = 1 - GROUP_SHARE + GROUP_SHARE * (o.groupSize - 1);
  const deliveries = CHAT_PEAK_MSGS * recipients;
  const keepalive = online / 60;
  const gatewayIn = o.poll > 0 ? online / o.poll + CHAT_PEAK_MSGS : CHAT_PEAK_MSGS * (1 + recipients) + keepalive;
  const servers = Math.ceil(online / o.perServer) + (o.poll > 0 ? Math.ceil(online / o.poll / 20_000) : 0);
  return {
    gatewayIn,
    delayMs: o.poll > 0 ? (o.poll * 1000) / 2 + 100 : 100,
    servers,
    costMonth: servers * SERVER_MONTH,
    storeWrites: o.copyPerMember ? CHAT_PEAK_MSGS * recipients : CHAT_PEAK_MSGS,
    deliveries,
    dropped: Math.min(online, o.perServer),
  };
}

/** 31M, 3.8k: a rate short enough to sit on a wire. */
export const compact = (n: number) => (n >= 1e9 ? `${Number((n / 1e9).toPrecision(2))}G` : n >= 1e6 ? `${Number((n / 1e6).toPrecision(2))}M` : n >= 1e3 ? `${Number((n / 1e3).toPrecision(2))}k` : `${Math.round(n)}`);
const perSec = (n: number) => `${compact(n)}/s`;
const money = (n: number) => `$${count(n)}`;
const weight = (n: number) => Math.max(0, Math.min(1, (Math.log10(Math.max(n, 1)) - 4) / 4));

export const FIGS = {
  'chat-estimate': estimateFigure({
    inputs: [
      { key: 'users', label: 'Users', min: 1e6, max: 2e9, value: 500e6, log: true, show: (v) => count(v), color: 'request' },
      { key: 'per', label: 'Messages each a day', min: 5, max: 200, value: 50, show: (v) => `${v}`, color: 'request' },
      { key: 'per server', label: 'Connections a server', min: 10_000, max: 3_000_000, value: 2_000_000, log: true, step: 10_000, show: (v) => count(v), color: 'busy' },
    ],
    rows: (v) => {
      const s = chatSize(v.users, v.per, 2, CHAT_ONLINE, v['per server'], 100);
      return [
        { label: 'Messages a day', say: count(s.perDay), how: `${count(v.users)} users × ${v.per} messages`, color: 'request' },
        { label: 'Messages a second, on average', say: `${count(s.mean)} a second`, how: `${count(s.perDay)} ÷ 86,400 seconds in a day`, color: 'request' },
        { label: 'At the evening peak', say: `${count(s.peak)} a second`, how: 'about twice the average', color: 'busy' },
        { label: 'Phones connected at the peak', say: count(s.online), how: `30% of ${count(v.users)} users online at once`, color: 'request' },
        { label: 'Servers just to hold the connections', say: count(s.gateways), how: `${count(s.online)} ÷ ${count(v['per server'])} a server`, color: 'cost' },
        { label: 'Message text stored a year', say: bytesSay(s.yearBytes), how: `${count(s.perDay)} a day × 365 × about 100 bytes`, color: 'data' },
      ];
    },
    ask: '500 million people each send 50 messages a day. About how many messages a second is that, on average?',
    options: ['About 3,000', 'About 30,000', 'About 300,000', 'About 3 million'],
    answer: 2,
    after: (v) => {
      const s = chatSize(v.users, v.per, 2, CHAT_ONLINE, v['per server'], 100);
      return `${count(s.peak)} messages a second at the peak, ${count(s.online)} phones holding connections, and ${count(s.gateways)} servers to hold them at ${count(v['per server'])} each.`;
    },
  }),

  'chat-send': figure(['offline'], (ctx, t) => {
    const W = 600;
    const H = 400;
    const f = frame(W, H, 2);
    let which = 0;
    let tl = chatTimeline(CHAT_CASES[which]);
    let view = sequenceView(f.svg, { x: 6, y: 4, w: W - 12, h: H - 8, lanes: CHAT_LANES, tMax: 600, colors: SEQUENCE });
    let now = 0;
    const say = () => {
      const c = CHAT_CASES[which];
      const end = now >= tl.tMax - 1;
      if (!end) return 'Press Play, or move the time slider, to follow the message.';
      if (c === 'online') return 'Alice saw one tick when the message was stored, two when Bob\'s phone had it, and "read" when he opened it.';
      if (c === 'offline') return 'The message waited in the store. A push woke Bob\'s phone, which asked for everything after 41, the last number it had.';
      return 'Alice\'s phone sent c7 twice. The chat service knew c7 already and gave it the same number, so Bob sees it once.';
    };
    const paint = () => {
      view.draw(tl.messages, tl.marks, now);
      f.readout.textContent = say();
      if (CHAT_CASES[which] === 'offline' && now >= tl.tMax - 1) t.done();
    };
    const time = slider('Time', 0, 600, 5, 0, (v) => `${v} ms`, (v) => { now = (v / 600) * tl.tMax; paint(); }, 'clock');
    const play = player(time, ctx, { seconds: 10 });
    const cases = named(pick(CHAT_CASE_NAMES, 0, (i) => {
      which = i;
      tl = chatTimeline(CHAT_CASES[i]);
      f.svg.replaceChildren();
      view = sequenceView(f.svg, { x: 6, y: 4, w: W - 12, h: H - 8, lanes: CHAT_LANES, tMax: tl.tMax, colors: SEQUENCE });
      time.set(0);
    }), 'Case:');
    f.svg.replaceChildren();
    view = sequenceView(f.svg, { x: 6, y: 4, w: W - 12, h: H - 8, lanes: CHAT_LANES, tMax: tl.tMax, colors: SEQUENCE });
    f.controls.append(cases.node, play.node, time.node);
    paint();
    return f.node;
  }),

  'chat-bench': figure(['held'], (_ctx, t) => {
    const W = 600;
    const H = 230;
    const f = frame(W, H, 4);
    const g = svg('g');
    f.svg.append(g);
    const o: ChatChoices = { poll: 5, perServer: 100_000, groupSize: 20, copyPerMember: true };
    const paint = () => {
      const L = chatLoad(o);
      const boxes: BoardBox[] = [
        { id: 'phones', x: 50, y: 110, label: 'Phones', sub: `${count(CHAT_USERS * CHAT_ONLINE)} online`, shape: 'pill', color: 'request', w: 96 },
        { id: 'gw', x: 215, y: 110, label: 'Gateways', sub: `${count(L.servers)} servers`, stack: true, color: 'busy', w: 96 },
        { id: 'chat', x: 375, y: 110, label: 'Chat service', sub: 'numbers, fans out', color: 'leader', w: 100 },
        { id: 'store', x: 530, y: 50, label: 'Message store', sub: `${perSec(L.storeWrites)} rows`, shape: 'store', color: 'data', w: 104 },
        { id: 'push', x: 530, y: 180, label: 'Push service', sub: 'phones asleep', color: 'request', w: 104 },
      ];
      const wires: BoardWire[] = [
        { from: 'phones', to: 'gw', text: perSec(L.gatewayIn), weight: weight(L.gatewayIn), color: o.poll ? 'busy' : 'request' },
        { from: 'gw', to: 'chat', text: perSec(CHAT_PEAK_MSGS), weight: weight(CHAT_PEAK_MSGS), color: 'request' },
        { from: 'chat', to: 'store', text: perSec(L.storeWrites), weight: weight(L.storeWrites), color: 'write', lift: 14 },
        { from: 'chat', to: 'push', text: 'when offline', weight: 0.1, color: 'request', lift: 10 },
      ];
      drawBoard(g, boxes, wires);
      f.readout.textContent = [
        `Alice to Bob: ${o.poll ? `${o.poll / 2} s on average` : 'about 0.1 s'}. Gateways take ${count(L.gatewayIn)} requests a second.`,
        `${count(L.servers)} gateway servers, about ${money(L.costMonth)} a month. Store: ${count(L.storeWrites)} rows a second.`,
        `One gateway dies: ${count(L.dropped)} phones reconnect; over 30 s with jitter, ${count(L.dropped / 30)} a second.`,
      ].join('\n');
      if (o.poll === 0 && !o.copyPerMember) t.done();
    };
    f.readout.style.whiteSpace = 'pre-line';
    const delivery = named(pick(['Poll every 5 s', 'Poll every 30 s', 'Held connection'], 0, (i) => { o.poll = [5, 30, 0][i]; paint(); }), 'Delivery:');
    const copies = named(pick(['A copy per member', 'One copy per conversation'], 0, (i) => { o.copyPerMember = i === 0; paint(); }), 'Store:');
    const conns = slider('Connections a gateway holds', { min: 10_000, max: 2_000_000, scale: 'log', step: 10_000, value: o.perServer, show: (v) => count(v), onInput: (v) => { o.perServer = v; paint(); }, color: 'busy' });
    const group = slider('Group size', { min: 2, max: 1000, scale: 'log', step: 1, value: o.groupSize, show: (v) => `${v} people`, onInput: (v) => { o.groupSize = v; paint(); }, color: 'write' });
    f.controls.append(delivery.node, copies.node, conns.node, group.node);
    paint();
    return f.node;
  }),
};
