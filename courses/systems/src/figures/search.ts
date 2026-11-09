// Lesson D3, From crawl to suggestion: a crawler's frontier with and without
// a queue per host, the inverted index sharded by document, a trie of
// completions searched at query time or precomputed, and a workbench for
// serving suggestions as people type.

import { makeRng } from 'didactics/rng';
import { svg } from 'didactics/dom';
import { label, line, redraw, small, still } from 'didactics/draw';
import { count } from 'sysdiagram/numbers';
import { COL, figure, frame, guessFirst, named, pick, slider, tint } from './kit';
import { compact } from './chat';
import { drawBoard, type BoardBox, type BoardWire } from './limiter';

// ---------------------------------------------------------------------------
// The frontier.

export type Frontier = 'none' | 'fifo' | 'perhost';
export const FRONTIERS: readonly Frontier[] = ['fifo', 'perhost', 'none'];
export const FRONTIER_NAMES = ['One queue, polite', 'A queue per host', 'One queue, impolite'];

/** Seconds one fetch takes, and the least gap between two requests to one host. */
export const FETCH_S = 0.5;
export const POLITE_S = 1;
export const HOSTS = 1000;

export interface CrawlResult {
  /** Pages fetched a second. */
  pages: number;
  /** Requests a second to the biggest host. */
  bigRate: number;
  /** Share of fetcher time spent waiting for a host to allow another request. */
  waiting: number;
  /** URLs for the biggest host found but not yet fetched, piling up a second. */
  backlog: number;
}

/**
 * A crawl of `seconds`: `fetchers` fetchers, a stream of discovered URLs of
 * which `bigShare` belong to one big host and the rest are spread over 999
 * others. `fifo` takes URLs in order and waits when the host isn't ready;
 * `perhost` keeps a queue per host and takes the host that is ready soonest;
 * `none` ignores politeness.
 */
export function crawl(design: Frontier, fetchers: number, bigShare: number, seconds = 60, seed = 3): CrawlResult {
  const rng = makeRng(seed);
  const nextHost = () => (rng() < bigShare ? 0 : 1 + Math.floor(rng() * (HOSTS - 1)));
  const ready = new Float64Array(HOSTS);
  let pages = 0;
  let big = 0;
  let waitTime = 0;
  // Measured over the second half, once the crawl has settled.
  const counted = (end: number) => end > seconds / 2 && end <= seconds;
  const span = (a: number, b: number) => Math.max(0, Math.min(b, seconds) - Math.max(a, seconds / 2));
  if (design === 'perhost') {
    // Every host has URLs waiting, and the frontier hands out the host that is
    // ready soonest. With equal gaps that is a rotation through the hosts: a
    // heap of ready times, in effect, with every host taking its turn.
    const order = Array.from({ length: HOSTS }, (_, i) => i);
    let head = 0;
    const free = new Float64Array(fetchers);
    for (;;) {
      let f = 0;
      for (let i = 1; i < fetchers; i++) if (free[i] < free[f]) f = i;
      const now = free[f];
      if (now >= seconds) break;
      const h = order[head];
      head = (head + 1) % HOSTS;
      const start = Math.max(now, ready[h]);
      waitTime += span(now, start);
      ready[h] = start + POLITE_S;
      free[f] = start + FETCH_S;
      if (counted(start + FETCH_S)) {
        pages++;
        if (h === 0) big++;
      }
    }
    const rate = pages / (seconds / 2);
    return { pages: rate, bigRate: big / (seconds / 2), waiting: waitTime / (fetchers * (seconds / 2)), backlog: Math.max(0, rate * bigShare - big / (seconds / 2)) };
  }
  const free = new Float64Array(fetchers);
  for (;;) {
    let f = 0;
    for (let i = 1; i < fetchers; i++) if (free[i] < free[f]) f = i;
    const now = free[f];
    if (now >= seconds) break;
    const h = nextHost();
    const start = design === 'none' ? now : Math.max(now, ready[h]);
    waitTime += span(now, start);
    ready[h] = Math.max(ready[h], start) + (design === 'none' ? 0 : POLITE_S);
    free[f] = start + FETCH_S;
    if (counted(start + FETCH_S)) {
      pages++;
      if (h === 0) big++;
    }
  }
  const half = seconds / 2;
  return { pages: pages / half, bigRate: big / half, waiting: waitTime / (fetchers * half), backlog: 0 };
}

// ---------------------------------------------------------------------------
// The trie of completions.

export interface TrieNode {
  children: Map<string, TrieNode>;
  /** Times this exact query was asked, if it is one. */
  count: number;
  /** The best completions under this node, precomputed: query and count. */
  top: [string, number][];
}

/** A small query log: a day's counts, in thousands, for queries starting with "s". */
export const QUERY_LOG: readonly [string, number][] = [
  ['seattle weather', 900],
  ['seahawks', 850],
  ['seattle times', 700],
  ['seafood near me', 500],
  ['search engine', 400],
  ['sea level', 300],
  ['sears', 200],
  ['season tickets', 150],
  ['seattle zoo', 120],
  ['sean penn', 100],
  ['sentence', 90],
  ['seattle to portland', 80],
];

/** A trie of `log`, each node holding its `k` most asked completions. */
export function buildTrie(log: readonly (readonly [string, number])[], k = 3): TrieNode {
  const root: TrieNode = { children: new Map(), count: 0, top: [] };
  for (const [q, n] of log) {
    let node = root;
    for (const ch of q) {
      let next = node.children.get(ch);
      if (!next) node.children.set(ch, (next = { children: new Map(), count: 0, top: [] }));
      node = next;
    }
    node.count += n;
  }
  const fill = (node: TrieNode, prefix: string): [string, number][] => {
    const all: [string, number][] = node.count ? [[prefix, node.count]] : [];
    for (const [ch, child] of node.children) all.push(...fill(child, prefix + ch));
    all.sort((a, b) => b[1] - a[1]);
    node.top = all.slice(0, k);
    return all.slice(0, k);
  };
  fill(root, '');
  return root;
}

/** The node at the end of `prefix`, and how many nodes the walk touched. */
function walk(root: TrieNode, prefix: string): { node?: TrieNode; steps: number } {
  let node: TrieNode | undefined = root;
  let steps = 0;
  for (const ch of prefix) {
    node = node?.children.get(ch);
    steps++;
    if (!node) break;
  }
  return { node, steps };
}

/** Completions read from the node's stored list: touches one node per letter typed. */
export function complete(root: TrieNode, prefix: string): { top: [string, number][]; visited: number } {
  const { node, steps } = walk(root, prefix);
  return { top: node ? node.top : [], visited: steps };
}

/** Completions found by visiting every node under the prefix, as a design that stores nothing extra must. */
export function scan(root: TrieNode, prefix: string, k = 3): { top: [string, number][]; visited: number } {
  const { node, steps } = walk(root, prefix);
  if (!node) return { top: [], visited: steps };
  const found: [string, number][] = [];
  let visited = steps;
  const go = (n: TrieNode, p: string) => {
    if (n.count) found.push([p, n.count]);
    for (const [ch, c] of n.children) {
      visited++;
      go(c, p + ch);
    }
  };
  go(node, prefix);
  found.sort((a, b) => b[1] - a[1]);
  return { top: found.slice(0, k), visited };
}

// ---------------------------------------------------------------------------
// Serving suggestions.

export interface SuggestChoices {
  /** Send a request on every keystroke, or only after a pause in typing. */
  pause: boolean;
  edge: 'off' | 'short' | 'top';
  shard: 'letter' | 'hash';
}

export const SEARCHES = 100_000;
export const KEYS_PER_SEARCH = 8;
/** Lookups a second one suggestion server answers from its table in memory. */
export const LOOKUPS_PER_SERVER = 20_000;

export interface SuggestLoad {
  requests: number;
  hit: number;
  origin: number;
  /** Load on the busiest shard over the average. */
  hot: number;
  servers: number;
  /** Median time to show suggestions, ms. */
  medianMs: number;
}

/** Load for 100,000 searches a second, about 8 keystrokes each. */
export function suggestLoad(o: SuggestChoices): SuggestLoad {
  const requests = SEARCHES * (o.pause ? KEYS_PER_SEARCH / 2 : KEYS_PER_SEARCH);
  const hit = o.edge === 'off' ? 0 : o.edge === 'short' ? 3 / KEYS_PER_SEARCH : 0.7;
  const origin = requests * (1 - hit);
  // Queries starting with "s" are about 11% of English queries; with 26 shards by first letter that shard has ~2.9x the average.
  const hot = o.shard === 'letter' ? 2.9 : 1.1;
  const servers = Math.ceil((origin * hot) / LOOKUPS_PER_SERVER);
  return { requests, hit, origin, hot, servers, medianMs: Math.round(hit * 15 + (1 - hit) * 60) };
}

const weight = (n: number) => Math.max(0, Math.min(1, (Math.log10(Math.max(n, 1)) - 4) / 2.5));

export const FIGS = {
  'search-frontier': figure(['polite'], (_ctx, t) => {
    const W = 560;
    const H = 230;
    const f = frame(W, H, 2);
    const g = svg('g');
    f.svg.append(g);
    let design = 0;
    let fetchers = 200;
    let share = 0.2;
    let open = false;
    const paint = () => {
      const r = crawl(FRONTIERS[design], fetchers, share);
      const parts: SVGElement[] = [];
      // Fetchers: a grid of dots, coloured by how they spend their time.
      const n = Math.min(fetchers, 200);
      const waitingDots = Math.round(n * r.waiting);
      parts.push(label(14, 18, `${fetchers} fetchers`, { size: 'note', bold: true }));
      for (let i = 0; i < n; i++) {
        const cx = 20 + (i % 20) * 11;
        const cy = 34 + Math.floor(i / 20) * 11;
        parts.push(svg('circle', { cx, cy, r: 4, fill: open ? (i < waitingDots ? COL.busy : COL.request) : COL.soft, opacity: open ? 1 : 0.4 }));
      }
      if (open) {
        parts.push(svg('circle', { cx: 20, cy: 160, r: 4, fill: COL.request }), small(28, 163, 'fetching'));
        parts.push(svg('circle', { cx: 80, cy: 160, r: 4, fill: COL.busy }), small(88, 163, 'waiting for a host'));
        parts.push(label(14, 190, `${count(r.pages)} pages a second`, { bold: true, fill: COL.answer }));
      }
      // Hosts: the biggest one's request rate against the polite limit.
      const x0 = 280;
      const top = 30;
      const hgt = 150;
      const max = 10;
      const Y = (v: number) => top + hgt - (Math.min(v, max) / max) * hgt;
      parts.push(label(x0, 18, 'Requests a second to each host', { size: 'note', bold: true }));
      parts.push(line(x0, top + hgt, W - 14, top + hgt, COL.ink, 1));
      parts.push(line(x0, Y(1), W - 14, Y(1), COL.answer, 1.2, { 'stroke-dasharray': '4 3' }), small(W - 14, Y(1) - 4, 'polite: 1 a second', { anchor: 'end', fill: COL.answer }));
      const others = open ? (r.pages - r.bigRate) / (HOSTS - 1) : 0;
      const bars: [string, number][] = [['big site', open ? r.bigRate : 0], ...Array.from({ length: 6 }, (_, i) => [`site ${i + 2}`, others] as [string, number])];
      bars.forEach(([name, v], i) => {
        const x = x0 + 12 + i * 38;
        const over = v > 1.05;
        parts.push(svg('rect', { x, y: Y(v), width: 26, height: top + hgt - Y(v), fill: over ? COL.error : COL.request, opacity: 0.85 }));
        if (v > max) parts.push(small(x + 13, top + 10, `${Math.round(v)}`, { anchor: 'middle', bold: true, fill: COL.error, halo: COL.paper }));
        parts.push(small(x + 13, top + hgt + 12, name, { anchor: 'middle', soft: true }));
      });
      parts.push(small(x0, top + hgt + 30, `${Math.round(share * 100)}% of links found point at the big site`, { soft: true }));
      redraw(g, ...parts);
      if (open) {
        const fair = r.bigRate <= 1.05;
        f.readout.textContent = `${FRONTIER_NAMES[design]}: ${count(r.pages)} pages a second, ${Math.round(r.waiting * 100)}% of fetcher time waiting; the big site gets ${r.bigRate.toFixed(1)} requests a second${fair ? '' : ', far over the polite rate'}.`;
        if (FRONTIERS[design] === 'perhost' && r.pages > 300) t.done();
      }
    };
    const designs = named(pick(FRONTIER_NAMES, 0, (i) => { design = i; paint(); }), 'Frontier:');
    const fet = slider('Fetchers', 10, 500, 10, fetchers, (v) => `${v}`, (v) => { fetchers = v; paint(); }, 'request');
    const sh = slider('Links to the big site', 0, 0.6, 0.05, share, (v) => `${Math.round(v * 100)}%`, (v) => { share = v; paint(); }, 'busy');
    f.controls.append(designs.node, fet.node, sh.node);
    guessFirst(t, f, {
      ask: 'One shared queue of URLs, 200 fetchers, at most one request a second to any site, and a fifth of the links found point at one big site. About how many pages a second does the crawl manage?',
      options: ['About 400', 'About 100', 'About 5'],
      answer: 2,
      sliders: [fet, sh],
      buttons: designs.buttons,
      after: () => { open = true; paint(); },
    });
    paint();
    return f.node;
  }),

  'search-index': () => {
    const W = 560;
    const H = 280;
    const s = still(W, H);
    const parts: SVGElement[] = [];
    parts.push(label(14, 20, 'An inverted index: each word to the documents that hold it', { size: 'note', bold: true }));
    const rows: [string, string, string][] = [
      ['salmon', '3, 17, 18, 102, 4051 …', '3, +14, +1, +84, +3949 …'],
      ['seattle', '3, 9, 17, 88, 102 …', '3, +6, +8, +71, +14 …'],
      ['weather', '9, 17, 40, 102, 977 …', '9, +8, +23, +62, +875 …'],
    ];
    parts.push(small(14, 40, 'word', { soft: true }), small(90, 40, 'posting list: document ids, sorted', { soft: true }), small(330, 40, 'on disk: gaps, a byte or two each', { soft: true }));
    rows.forEach(([w, ids, gaps], i) => {
      const y = 58 + i * 20;
      parts.push(label(14, y, w, { size: 'note', bold: true, fill: COL.data }));
      parts.push(svg('rect', { x: 86, y: y - 12, width: 230, height: 16, rx: 3, fill: tint(COL.data, 0.08) }), small(92, y, ids));
      parts.push(svg('rect', { x: 326, y: y - 12, width: 220, height: 16, rx: 3, fill: tint(COL.write, 0.08) }), small(332, y, gaps));
    });
    parts.push(small(14, 128, '"seattle weather" = the documents in both lists: 9, 17, 102 …, walked side by side in id order.', { soft: true }));
    // Sharded by document, asked by scatter and gather.
    const y0 = 150;
    parts.push(label(14, y0 + 6, 'Sharded by document', { size: 'note', bold: true }));
    const root: [number, number] = [W / 2, y0 + 22];
    parts.push(svg('rect', { x: root[0] - 50, y: root[1] - 12, width: 100, height: 24, rx: 4, fill: tint(COL.request, 0.12), stroke: COL.request }), small(root[0], root[1] + 4, 'query root', { anchor: 'middle', bold: true }));
    const shards = ['docs 0–1B', 'docs 1–2B', 'docs 2–3B', 'docs 3–4B', '…'];
    shards.forEach((name, i) => {
      const x = 70 + i * 105;
      const y = y0 + 82;
      parts.push(line(root[0], root[1] + 12, x, y - 14, COL.request, 1.2));
      parts.push(svg('rect', { x: x - 44, y: y - 14, width: 88, height: 28, rx: 4, fill: tint(COL.data, 0.1), stroke: COL.data }));
      parts.push(small(x, y - 1, name, { anchor: 'middle', bold: true }), small(x, y + 10, 'its own top 10', { anchor: 'middle', soft: true }));
    });
    parts.push(small(W / 2, H - 8, 'Every shard searches its own documents; the root merges their top tens and waits for the slowest (lesson 9).', { anchor: 'middle', soft: true }));
    redraw(s.svg, ...parts);
    return { node: s.node };
  },

  'search-trie': figure(['typed'], (_ctx, t) => {
    const W = 560;
    const H = 210;
    const f = frame(W, H, 2);
    const g = svg('g');
    f.svg.append(g);
    const root = buildTrie(QUERY_LOG, 3);
    const prefixes = ['s', 'se', 'sea', 'seat', 'seattle'];
    let at = 2;
    let pre = false;
    const seen = new Set<number>();
    const paint = () => {
      const p = prefixes[at];
      const r = pre ? complete(root, p) : scan(root, p);
      const parts: SVGElement[] = [];
      // The typed prefix, one box per letter: the walk down the trie.
      parts.push(label(14, 20, 'Typed so far', { size: 'note', bold: true }));
      [...p].forEach((ch, i) => {
        parts.push(svg('rect', { x: 14 + i * 26, y: 30, width: 22, height: 24, rx: 4, fill: tint(COL.request, 0.12), stroke: COL.request }));
        parts.push(label(25 + i * 26, 47, ch, { anchor: 'middle', bold: true }));
      });
      parts.push(small(14, 72, pre ? 'Each node already holds its top three: read them at the last letter.' : 'Visit every node under the last letter, then pick the top three.', { soft: true }));
      // The cost: nodes touched.
      const all = scan(root, p).visited;
      const max = scan(root, 's').visited;
      const bw = W - 200;
      parts.push(label(14, 100, 'Nodes touched', { size: 'note', bold: true }));
      parts.push(svg('rect', { x: 120, y: 88, width: bw, height: 14, fill: tint(COL.soft, 0.15) }));
      parts.push(svg('rect', { x: 120, y: 88, width: (bw * r.visited) / max, height: 14, fill: pre ? COL.cache : COL.busy }));
      parts.push(small(124 + (bw * r.visited) / max, 99, `${r.visited}${pre ? '' : ` (of ${all})`}`, { bold: true }));
      // The answers.
      parts.push(label(14, 132, 'Suggestions', { size: 'note', bold: true }));
      r.top.forEach(([q, n], i) => {
        const y = 150 + i * 20;
        const best = r.top[0]?.[1] ?? 1;
        parts.push(svg('rect', { x: 120, y: y - 11, width: ((bw - 60) * n) / best, height: 14, fill: tint(COL.answer, 0.2) }));
        parts.push(small(126, y, q, { bold: true }), small(W - 70, y, `${n}k a day`, { soft: true }));
      });
      redraw(g, ...parts);
      f.readout.textContent = `"${p}": ${pre ? `${r.visited} nodes, one per letter, however many queries start this way` : `${r.visited} nodes; with a billion real queries the subtree under "s" alone holds hundreds of millions`}.`;
      if (pre) seen.add(at);
      if (seen.size >= 3) t.done();
    };
    const mode = named(pick(['Search the subtree', 'Top three stored at each node'], 0, (i) => { pre = i === 1; paint(); }), 'Design:');
    const typed = named(pick(prefixes, at, (i) => { at = i; paint(); }), 'Prefix:');
    f.controls.append(mode.node, typed.node);
    paint();
    return f.node;
  }),

  'search-bench': figure(['fast'], (_ctx, t) => {
    const W = 600;
    const H = 220;
    const f = frame(W, H, 3);
    const g = svg('g');
    f.svg.append(g);
    f.readout.style.whiteSpace = 'pre-line';
    const o: SuggestChoices = { pause: false, edge: 'off', shard: 'letter' };
    const paint = () => {
      const L = suggestLoad(o);
      const boxes: BoardBox[] = [
        { id: 'browser', x: 52, y: 100, label: 'Browsers', sub: `${count(SEARCHES)} searches/s`, shape: 'pill', color: 'request', w: 96 },
        { id: 'edge', x: 200, y: 100, label: 'Edge cache', sub: o.edge === 'off' ? 'off' : `${Math.round(L.hit * 100)}% hits`, color: 'cache', faded: o.edge === 'off', w: 92 },
        { id: 'suggest', x: 350, y: 100, label: 'Suggest servers', sub: `${count(L.servers)} servers`, stack: true, color: 'busy', w: 104 },
        { id: 'table', x: 530, y: 100, label: 'Prefix table', sub: o.shard === 'letter' ? 'in memory, by letter' : 'in memory, by hash', shape: 'store', color: 'data', w: 112 },
        { id: 'logs', x: 350, y: 190, label: 'Daily build', sub: 'from query logs', color: 'write', w: 104 },
      ];
      const wires: BoardWire[] = [
        { from: 'browser', to: 'edge', text: `${compact(L.requests)}/s`, weight: weight(L.requests), color: 'request' },
        { from: 'edge', to: 'suggest', text: `${compact(L.origin)}/s`, weight: weight(L.origin), color: 'request' },
        { from: 'suggest', to: 'table', weight: 0.2, color: 'data' },
        { from: 'logs', to: 'table', text: 'new table each day', weight: 0.05, color: 'write', lift: -14 },
      ];
      drawBoard(g, boxes, wires);
      f.readout.textContent = [
        `${count(L.requests)} requests a second; ${count(L.origin)} reach the suggest servers. Median ${L.medianMs} ms to show suggestions.`,
        `Busiest shard: ${L.hot.toFixed(1)} times the average, so every shard is sized for it: ${count(L.servers)} servers.`,
      ].join('\n');
      if (L.origin < 400_000 && L.hot < 1.5) t.done();
    };
    const pause = named(pick(['Every keystroke', 'After a 100 ms pause'], 0, (i) => { o.pause = i === 1; paint(); }), 'Ask:');
    const edge = named(pick(['No edge cache', 'Cache prefixes of 1 to 3 letters', 'Cache the top million prefixes'], 0, (i) => { o.edge = (['off', 'short', 'top'] as const)[i]; paint(); }), 'Edge:');
    const shard = named(pick(['By first letter', 'By hash of the prefix'], 0, (i) => { o.shard = i === 0 ? 'letter' : 'hash'; paint(); }), 'Shard:');
    f.controls.append(pause.node, edge.node, shard.node);
    paint();
    return f.node;
  }),
};
