// Consistent hashing: nodes and keys hashed onto one circle, each key owned
// by the first node clockwise from it. Each node can stand at several points
// (virtual nodes) so the arcs even out. Moving from one set of nodes to
// another moves only the keys whose owner changed; with `key mod n` almost
// every key moves. No DOM.

/** FNV-1a, 32 bits, as a number 0 to 2^32 - 1. */
export function hash32(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  // A final mix, so neighbouring strings land far apart.
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

/** Where on the circle, 0 to 1. */
export const spot = (s: string) => hash32(s) / 2 ** 32;

export interface Point {
  node: string;
  /** Its place on the circle, 0 to 1. */
  at: number;
}

export class Ring {
  readonly points: Point[];
  constructor(
    readonly nodes: readonly string[],
    readonly vnodes = 1,
  ) {
    this.points = nodes
      .flatMap((node) => Array.from({ length: vnodes }, (_, i) => ({ node, at: spot(`${node}#${i}`) })))
      .sort((a, b) => a.at - b.at);
  }

  /** The node that owns a place on the circle. */
  ownerAt(at: number): string {
    const p = this.points;
    if (!p.length) throw new Error('an empty ring');
    let lo = 0;
    let hi = p.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (p[mid].at < at) lo = mid + 1;
      else hi = mid;
    }
    return p[lo % p.length].node;
  }

  /** The node that owns a key. */
  owner(key: string | number): string {
    return this.ownerAt(spot(`k${key}`));
  }

  /** The first `n` distinct nodes clockwise from a key: its replicas (Dynamo's preference list). */
  replicas(key: string | number, n: number): string[] {
    const at = spot(`k${key}`);
    const p = this.points;
    let i = p.findIndex((q) => q.at >= at);
    if (i < 0) i = 0;
    const out: string[] = [];
    for (let k = 0; k < p.length && out.length < Math.min(n, this.nodes.length); k++) {
      const node = p[(i + k) % p.length].node;
      if (!out.includes(node)) out.push(node);
    }
    return out;
  }

  /** The share of the circle each node owns. */
  shares(): Map<string, number> {
    const m = new Map<string, number>(this.nodes.map((n) => [n, 0]));
    const p = this.points;
    for (let i = 0; i < p.length; i++) {
      const prev = i === 0 ? p[p.length - 1].at - 1 : p[i - 1].at;
      m.set(p[i].node, m.get(p[i].node)! + (p[i].at - prev));
    }
    return m;
  }
}

/** Share of `keys` keys whose owner differs between two ways of placing them. */
export function moved(keys: number, a: (k: number) => string, b: (k: number) => string): number {
  let n = 0;
  for (let k = 0; k < keys; k++) if (a(k) !== b(k)) n++;
  return keys ? n / keys : 0;
}

/** `key mod n` placement over named nodes, for comparison. */
export const modulo = (nodes: readonly string[]) => (k: number) => nodes[k % nodes.length];
