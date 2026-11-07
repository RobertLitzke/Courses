// The sand table: a grid of ground heights with water on it. Rain and rivers
// add water, the water runs downhill from cell to cell through "pipes"
// between neighbours (the virtual-pipe model of Mei, Decaudin and Hu, 2007),
// and where it runs fast it picks up sand and where it slows it drops it.
// Optional pieces: a sea held at a level that can rise and fall with a tide,
// waves that stir the shallows and drift sand along the shore and wear back
// the land behind them, ground that soaks up rain, dams, and land that rises.
//
// Units are the model's own: one cell is one unit across, heights are in the
// same units, time in steps of `dt`. Erosion is sped up enormously, so a
// valley changes in a minute of play: a figure says "a model" and calibrates
// its labels (years, metres) itself. Plain TypeScript, no DOM.

export type Edge = 'wall' | 'open';

export interface TableInit {
  nx: number;
  ny: number;
  /** The ground's height at a cell; i runs across (left to right), j down the page. */
  bed: (i: number, j: number) => number;
  /** Hard rock: the ground never wears below this (default: no limit). */
  floor?: (i: number, j: number) => number;
  /** How easily the ground wears, 0 (never) to 1 or more (default 1). */
  erodibility?: (i: number, j: number) => number;
  /** How much of the infiltration rate a cell takes, 0 (paved, rock) to 1 (default 1). */
  soak?: (i: number, j: number) => number;
  /** Cells held at sea level: the open sea beyond the edge of the table. */
  sea?: (i: number, j: number) => boolean;
  /** Where the land rises when `uplift` is set (default everywhere but the sea). */
  rises?: (i: number, j: number) => number;
  /** Water and sand leave through an open edge and stop at a wall (default: walls). */
  edges?: Partial<Record<'left' | 'right' | 'top' | 'bottom', Edge>>;
  /** Water already lying on the table, as a level to fill below (default: sea level when there is a sea, else none). */
  fill?: number;
  params?: Partial<Params>;
}

export interface Params {
  dt: number;
  gravity: number;
  /** Share of each pipe's flow kept from one step to the next: below 1, it is friction. */
  keep: number;
  /** Friction with the bed, stronger in shallow water: water running steadily down a slope S at depth h goes at about gravity × S × √h / drag. */
  drag: number;
  /** Rain, as a depth per unit time on every cell (times `rainOn`, if set). */
  rain: number;
  /** Ground soaking up water, as a depth per unit time (times each cell's `soak`). Only shallow water soaks in. */
  infiltration: number;
  /** Mean sea level, for the cells held as sea. */
  sea: number;
  /** The tide's half range, and its period in model time. */
  tide: number;
  tidePeriod: number;
  /** Sand the water can carry per unit depth per unit of speed above `start`. */
  carry: number;
  /** The speed below which water picks nothing up (Hjulström's line, for one size of sand). */
  start: number;
  /** How fast the bed gives sand to water that can carry more, and takes it back from water carrying too much. */
  pickUp: number;
  settle: number;
  /** The steepest step between neighbours that stands; anything steeper slumps. */
  talus: number;
  slump: number;
  /** Land rising, height per unit time (times each cell's `rises`). */
  uplift: number;
  /** Waves: the stirring speed they add in the surf zone (0 for no waves). */
  waves: number;
  /** The depth of the surf zone, where waves break and stir the bed. */
  surf: number;
  /** The direction sand drifts along the shore, as a unit vector [across, down], and the share of the surf zone's load it moves per unit time. */
  driftTo: [number, number];
  drift: number;
  /** How fast waves wear back land standing at the water's edge (times its erodibility). */
  cliff: number;
  /** Swash: the share of the load in the shallowest surf thrown up onto the beach per unit time, building a berm up to `berm` above sea level. */
  swash: number;
  berm: number;
}

export const DEFAULTS: Params = {
  dt: 0.05,
  gravity: 9.81,
  keep: 0.995,
  drag: 0.5,
  rain: 0,
  infiltration: 0,
  sea: 0,
  tide: 0,
  tidePeriod: 200,
  carry: 0.5,
  start: 0.05,
  pickUp: 0.5,
  settle: 0.5,
  talus: 0.6,
  slump: 0.25,
  uplift: 0,
  waves: 0,
  surf: 0.5,
  driftTo: [1, 0],
  drift: 0.3,
  cliff: 0,
  swash: 0,
  berm: 0.12,
};

/** Water poured in at one cell: a river entering the table, or a shower on one spot. */
export interface Source {
  k: number;
  /** Water per unit time. */
  flow: number;
  /** Sand per unit of water. */
  sand?: number;
  /** Dye per unit of water (0 to 1), to follow where it goes. */
  dye?: number;
}

/** What has left the table so far, added up since the start. */
export interface Totals {
  /** Water and sand into the sea cells (less what the tide brought back out). */
  water: number;
  sand: number;
  /** Water and sand out through open edges. */
  outWater: number;
  outSand: number;
  /** Water soaked into the ground. */
  soaked: number;
  /** Dye into the sea cells, and out through open edges. */
  dye: number;
  outDye: number;
}

const FIELDS = ['z', 'z0', 'floor', 'erod', 'h', 'm', 'salt', 'dye', 'fl', 'fr', 'ft', 'fb', 'vx', 'vy', 'works', 'under'] as const;
type Field = (typeof FIELDS)[number];

/** A copy of everything that changes, to come back to. */
export interface Snapshot {
  t: number;
  arrays: Record<Field, Float32Array>;
  totals: Totals;
  params: Params;
  sources: Source[];
}

export class Table {
  readonly nx: number;
  readonly ny: number;
  readonly n: number;
  /** Ground height, and the ground as it started, lifted by any uplift since (to show what was cut and what was laid down). */
  z: Float32Array;
  readonly z0: Float32Array;
  floor: Float32Array;
  erod: Float32Array;
  readonly soak: Float32Array;
  readonly rises: Float32Array;
  readonly sea: Uint8Array;
  /** Water depth; sand, salt and dye carried in it (as amounts, not concentrations). */
  h: Float32Array;
  m: Float32Array;
  salt: Float32Array;
  dye: Float32Array;
  /** Flow out through the pipe to each neighbour: left, right, top, bottom. */
  fl: Float32Array;
  fr: Float32Array;
  ft: Float32Array;
  fb: Float32Array;
  /** The water's speed, across and down. */
  vx: Float32Array;
  vy: Float32Array;
  /** 1 where people have built (a dam), and the ground under it. */
  works: Float32Array;
  under: Float32Array;
  /** Optional mask for rain (1 where it rains). */
  rainOn: Float32Array | null = null;
  /** Optional mask for waves (1 on open coast, 0 in shelter). */
  waveOn: Float32Array | null = null;
  readonly edges: Record<'left' | 'right' | 'top' | 'bottom', Edge>;
  p: Params;
  sources: Source[] = [];
  t = 0;
  totals: Totals = { water: 0, sand: 0, outWater: 0, outSand: 0, soaked: 0, dye: 0, outDye: 0 };
  // Scratch space for one step.
  private nh: Float32Array;
  private nm: Float32Array;
  private ns: Float32Array;
  private nd: Float32Array;
  private dz: Float32Array;

  constructor(o: TableInit) {
    const { nx, ny } = o;
    this.nx = nx;
    this.ny = ny;
    const n = (this.n = nx * ny);
    const grid = (f: ((i: number, j: number) => number) | undefined, d: number) => {
      const a = new Float32Array(n);
      for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) a[j * nx + i] = f ? f(i, j) : d;
      return a;
    };
    this.z = grid(o.bed, 0);
    this.z0 = this.z.slice();
    this.floor = grid(o.floor, -1e9);
    this.erod = grid(o.erodibility, 1);
    this.soak = grid(o.soak, 1);
    this.sea = new Uint8Array(n);
    if (o.sea) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) this.sea[j * nx + i] = o.sea(i, j) ? 1 : 0;
    this.rises = grid(o.rises ?? ((i, j) => (this.sea[j * nx + i] ? 0 : 1)), 1);
    for (let k = 0; k < n; k++) this.floor[k] = Math.min(this.floor[k], this.z[k]);
    this.h = new Float32Array(n);
    this.m = new Float32Array(n);
    this.salt = new Float32Array(n);
    this.dye = new Float32Array(n);
    this.fl = new Float32Array(n);
    this.fr = new Float32Array(n);
    this.ft = new Float32Array(n);
    this.fb = new Float32Array(n);
    this.vx = new Float32Array(n);
    this.vy = new Float32Array(n);
    this.works = new Float32Array(n);
    this.under = new Float32Array(n);
    this.nh = new Float32Array(n);
    this.nm = new Float32Array(n);
    this.ns = new Float32Array(n);
    this.nd = new Float32Array(n);
    this.dz = new Float32Array(n);
    this.edges = { left: 'wall', right: 'wall', top: 'wall', bottom: 'wall', ...o.edges };
    this.p = { ...DEFAULTS, ...o.params };
    const level = this.seaLevel();
    // Water lying on the table at the start: to `fill`, or with a sea, everything below sea level.
    const fill = o.fill ?? (o.sea ? level : undefined);
    if (fill !== undefined) for (let k = 0; k < n; k++) this.h[k] = Math.max(0, fill - this.z[k]);
    for (let k = 0; k < n; k++) {
      if (this.sea[k]) this.h[k] = Math.max(0, level - this.z[k]);
      // Water below sea level at the start is sea water.
      if (this.h[k] > 0 && this.z[k] < level) this.salt[k] = this.h[k];
    }
  }

  /** The cell's index. */
  k(i: number, j: number): number {
    return j * this.nx + i;
  }

  /** The sea's level now, tide included. */
  seaLevel(t = this.t): number {
    const p = this.p;
    return p.sea + (p.tide ? p.tide * Math.sin((2 * Math.PI * t) / p.tidePeriod) : 0);
  }

  /** The water's speed at a cell. */
  speed(k: number): number {
    return Math.hypot(this.vx[k], this.vy[k]);
  }

  /** The share of the water at a cell that is sea water (0 to 1). */
  saltiness(k: number): number {
    return this.h[k] > 1e-4 ? Math.min(1, this.salt[k] / this.h[k]) : 0;
  }

  /** Sand per unit of water at a cell. */
  muddiness(k: number): number {
    return this.h[k] > 1e-4 ? this.m[k] / this.h[k] : 0;
  }

  /** Dye per unit of water at a cell. */
  dyeAt(k: number): number {
    return this.h[k] > 1e-4 ? Math.min(1, this.dye[k] / this.h[k]) : 0;
  }

  /** Build a wall of works (a dam) on these cells, its top at `top`. */
  build(cells: number[], top: number): void {
    for (const k of cells) {
      if (this.works[k]) continue;
      this.works[k] = 1;
      this.under[k] = this.z[k];
      this.z[k] = Math.max(this.z[k], top);
      this.floor[k] = this.z[k];
      // Water that was there spills off.
      this.h[k] = 0;
    }
  }

  /** Take the works off these cells, leaving the ground that was under them. */
  remove(cells: number[]): void {
    for (const k of cells) {
      if (!this.works[k]) continue;
      this.works[k] = 0;
      this.z[k] = this.under[k];
      this.floor[k] = Math.min(this.floor[k], this.under[k], this.z0[k]);
    }
  }

  /** Pour water (and anything in it) onto a cell at once. */
  pour(k: number, water: number, o: { sand?: number; dye?: number } = {}): void {
    this.h[k] += water;
    this.m[k] += water * (o.sand ?? 0);
    this.dye[k] += water * (o.dye ?? 0);
  }

  save(): Snapshot {
    const arrays = {} as Record<Field, Float32Array>;
    for (const f of FIELDS) arrays[f] = this[f].slice();
    return { t: this.t, arrays, totals: { ...this.totals }, params: { ...this.p, driftTo: [...this.p.driftTo] as [number, number] }, sources: this.sources.map((s) => ({ ...s })) };
  }

  load(s: Snapshot): void {
    for (const f of FIELDS) this[f].set(s.arrays[f]);
    this.t = s.t;
    this.totals = { ...s.totals };
    this.p = { ...s.params, driftTo: [...s.params.driftTo] as [number, number] };
    this.sources = s.sources.map((x) => ({ ...x }));
  }

  /** Run `steps` steps. */
  run(steps: number): void {
    for (let s = 0; s < steps; s++) this.step();
  }

  /** One step of `dt`. */
  step(): void {
    const { nx, ny, n, z, h, m, salt, dye, fl, fr, ft, fb, vx, vy, sea, erod, floor } = this;
    const p = this.p;
    const dt = p.dt;
    const level = this.seaLevel();
    const nh = this.nh;
    const nm = this.nm;
    const ns = this.ns;
    const nd = this.nd;
    const tot = this.totals;

    // 1. Water in: rain, rivers, and the sea held at its level.
    if (p.rain > 0) {
      const on = this.rainOn;
      for (let k = 0; k < n; k++) if (!sea[k]) h[k] += p.rain * dt * (on ? on[k] : 1);
    }
    for (const s of this.sources) {
      const w = s.flow * dt;
      h[s.k] += w;
      m[s.k] += w * (s.sand ?? 0);
      dye[s.k] += w * (s.dye ?? 0);
    }
    for (let k = 0; k < n; k++) {
      if (!sea[k]) continue;
      h[k] = Math.max(0, level - z[k]);
      salt[k] = h[k];
      m[k] = 0;
      dye[k] = 0;
    }

    // 2. The pipes: each one's flow speeds up with the difference in level across it.
    const g = p.gravity * dt;
    const keep = p.keep;
    const E = this.edges;
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        const k = j * nx + i;
        const H = z[k] + h[k];
        let a: number, b: number, c: number, d: number;
        if (i > 0) a = Math.max(0, fl[k] * keep + g * (H - z[k - 1] - h[k - 1]));
        else a = E.left === 'open' ? Math.max(0, fl[k] * keep + g * h[k]) : 0;
        if (i < nx - 1) b = Math.max(0, fr[k] * keep + g * (H - z[k + 1] - h[k + 1]));
        else b = E.right === 'open' ? Math.max(0, fr[k] * keep + g * h[k]) : 0;
        if (j > 0) c = Math.max(0, ft[k] * keep + g * (H - z[k - nx] - h[k - nx]));
        else c = E.top === 'open' ? Math.max(0, ft[k] * keep + g * h[k]) : 0;
        if (j < ny - 1) d = Math.max(0, fb[k] * keep + g * (H - z[k + nx] - h[k + nx]));
        else d = E.bottom === 'open' ? Math.max(0, fb[k] * keep + g * h[k]) : 0;
        // Friction with the bed: shallow water is held back more than deep.
        const hd = Math.max(h[k], 0.02);
        const slow = 1 / (1 + (dt * p.drag) / (hd * Math.sqrt(hd)));
        a *= slow;
        b *= slow;
        c *= slow;
        d *= slow;
        const sum = (a + b + c + d) * dt;
        // Never send out more water than the cell holds.
        if (sum > h[k]) {
          const K = sum > 0 ? h[k] / sum : 0;
          a *= K;
          b *= K;
          c *= K;
          d *= K;
        }
        fl[k] = a;
        fr[k] = b;
        ft[k] = c;
        fb[k] = d;
      }
    }

    // 3. Move the water, and the sand, salt and dye in it, along the pipes.
    nh.set(h);
    nm.set(m);
    ns.set(salt);
    nd.set(dye);
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        const k = j * nx + i;
        const out = (fl[k] + fr[k] + ft[k] + fb[k]) * dt;
        if (out <= 0) continue;
        const hk = h[k];
        const cm = hk > 1e-9 ? m[k] / hk : 0;
        const cs = hk > 1e-9 ? salt[k] / hk : 0;
        const cd = hk > 1e-9 ? dye[k] / hk : 0;
        nh[k] -= out;
        nm[k] -= out * cm;
        ns[k] -= out * cs;
        nd[k] -= out * cd;
        const to = (w: number, nb: number) => {
          if (w <= 0) return;
          if (nb < 0) {
            tot.outWater += w;
            tot.outSand += w * cm;
            tot.outDye += w * cd;
            return;
          }
          nh[nb] += w;
          nm[nb] += w * cm;
          ns[nb] += w * cs;
          nd[nb] += w * cd;
          if (sea[nb] && !sea[k]) {
            tot.water += w;
            tot.sand += w * cm;
            tot.dye += w * cd;
          } else if (sea[k] && !sea[nb]) {
            tot.water -= w;
          }
        };
        to(fl[k] * dt, i > 0 ? k - 1 : -1);
        to(fr[k] * dt, i < nx - 1 ? k + 1 : -1);
        to(ft[k] * dt, j > 0 ? k - nx : -1);
        to(fb[k] * dt, j < ny - 1 ? k + nx : -1);
      }
    }

    // 4. The water's speed, from the flow through each cell and its depth.
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        const k = j * nx + i;
        // A floor under the depth keeps a film of water from reading as a torrent.
        const depth = Math.max(0.05, (h[k] + nh[k]) / 2);
        if (h[k] + nh[k] < 2e-3) {
          vx[k] = 0;
          vy[k] = 0;
          continue;
        }
        const inL = i > 0 ? fr[k - 1] : 0;
        const inR = i < nx - 1 ? fl[k + 1] : 0;
        const inT = j > 0 ? fb[k - nx] : 0;
        const inB = j < ny - 1 ? ft[k + nx] : 0;
        vx[k] = (inL - fl[k] + fr[k] - inR) / 2 / depth;
        vy[k] = (inT - ft[k] + fb[k] - inB) / 2 / depth;
      }
    }
    h.set(nh);
    m.set(nm);
    salt.set(ns);
    dye.set(nd);

    // 5. Wear and laying down: water faster than `start` can carry sand in
    // proportion to its depth and its extra speed; it takes from the bed
    // when it carries less than that and drops sand when it carries more.
    // Waves add their stirring in the surf zone and drift the load along shore.
    const waves = p.waves > 0;
    const [dx, dy] = p.driftTo;
    const dz = this.dz;
    dz.fill(0);
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        const k = j * nx + i;
        if (sea[k]) continue;
        const hk = h[k];
        if (hk < 1e-4) {
          // Water gone: whatever it carried is left where it was.
          if (m[k] > 0) {
            z[k] += m[k];
            m[k] = 0;
          }
          continue;
        }
        let v = Math.hypot(vx[k], vy[k]);
        let surf = false;
        let wave = 0;
        if (waves) {
          const depth = level - z[k];
          wave = p.waves * (this.waveOn ? this.waveOn[k] : 1);
          if (depth > 0 && depth < p.surf && wave > 0) {
            surf = true;
            v = Math.hypot(v, wave * (1 - (0.5 * depth) / p.surf));
          }
        }
        const cap = p.carry * Math.min(hk, 1) * Math.max(0, v - p.start);
        if (m[k] < cap) {
          const e = Math.min(p.pickUp * (cap - m[k]) * dt * erod[k], Math.max(0, z[k] - floor[k]));
          z[k] -= e;
          m[k] += e;
        } else {
          const d = p.settle * (m[k] - cap) * dt;
          z[k] += d;
          m[k] -= d;
        }
        if (surf && p.drift > 0) {
          // Drift: part of the load moves to the downdrift neighbours, if they are wet.
          const move = m[k] * p.drift * dt * (wave / p.waves);
          const ax = Math.abs(dx);
          const ay = Math.abs(dy);
          const sum = ax + ay || 1;
          const nbx = dx > 0 ? (i < nx - 1 ? k + 1 : -1) : i > 0 ? k - 1 : -1;
          const nby = dy > 0 ? (j < ny - 1 ? k + nx : -1) : j > 0 ? k - nx : -1;
          if (nbx >= 0 && h[nbx] > 1e-3 && !sea[nbx]) {
            const w = (move * ax) / sum;
            m[k] -= w;
            dz[nbx] += w;
          }
          if (nby >= 0 && h[nby] > 1e-3 && !sea[nby]) {
            const w = (move * ay) / sum;
            m[k] -= w;
            dz[nby] += w;
          }
        }
        if (surf && p.swash > 0 && level - z[k] < p.surf * 0.6) {
          // Swash: the uprush throws sand onto the highest neighbour still below the berm's top.
          let best = -1;
          const nbs = [i > 0 ? k - 1 : -1, i < nx - 1 ? k + 1 : -1, j > 0 ? k - nx : -1, j < ny - 1 ? k + nx : -1];
          for (const nb of nbs) if (nb >= 0 && !sea[nb] && !this.works[nb] && z[nb] < level + p.berm && z[nb] > z[k] && (best < 0 || z[nb] > z[best])) best = nb;
          const target = best >= 0 ? best : z[k] < level + p.berm ? k : -1;
          if (target >= 0) {
            const w = Math.min(m[k], m[k] * p.swash * dt * (wave / p.waves), level + p.berm - z[target]);
            if (w > 0) {
              m[k] -= w;
              z[target] += w;
            }
          }
        }
        if (surf && p.cliff > 0) {
          // Waves wear back the land standing at the water's edge beside the surf.
          const nbs = [i > 0 ? k - 1 : -1, i < nx - 1 ? k + 1 : -1, j > 0 ? k - nx : -1, j < ny - 1 ? k + nx : -1];
          for (const nb of nbs) {
            if (nb < 0 || sea[nb] || z[nb] < level) continue;
            const e = Math.min(p.cliff * wave * dt * erod[nb], Math.max(0, z[nb] - floor[nb]));
            z[nb] -= e;
            m[k] += e;
          }
        }
      }
    }
    // Drifted sand joins the next cell's load.
    for (let k = 0; k < n; k++) if (dz[k]) m[k] += dz[k];

    // 6. Shallow water soaks into the ground.
    if (p.infiltration > 0) {
      const soak = this.soak;
      for (let k = 0; k < n; k++) {
        if (sea[k] || h[k] <= 0 || h[k] > 0.05) continue;
        const s = Math.min(h[k], p.infiltration * soak[k] * dt);
        if (s <= 0) continue;
        const share = s / h[k];
        h[k] -= s;
        salt[k] -= salt[k] * share;
        dye[k] -= dye[k] * share;
        tot.soaked += s;
      }
    }

    // 7. Slopes steeper than the talus slump (works stand firm).
    if (p.slump > 0) {
      dz.fill(0);
      const T = p.talus;
      const r = p.slump * Math.min(1, dt * 20);
      for (let j = 0; j < ny; j++) {
        for (let i = 0; i < nx; i++) {
          const k = j * nx + i;
          for (const nb of [i < nx - 1 ? k + 1 : -1, j < ny - 1 ? k + nx : -1]) {
            if (nb < 0) continue;
            const d = z[k] - z[nb];
            if (Math.abs(d) <= T) continue;
            const [hi, lo] = d > 0 ? [k, nb] : [nb, k];
            if (this.works[hi] || erod[hi] <= 0) continue;
            const amt = Math.min((r * (Math.abs(d) - T)) / 2, Math.max(0, z[hi] - floor[hi]));
            dz[hi] -= amt;
            dz[lo] += amt;
          }
        }
      }
      for (let k = 0; k < n; k++) z[k] += dz[k];
    }

    // 8. The land rises.
    if (p.uplift) {
      const up = p.uplift * dt;
      const rises = this.rises;
      for (let k = 0; k < n; k++) {
        if (!rises[k]) continue;
        z[k] += up * rises[k];
        floor[k] += up * rises[k];
        // The starting ground rises too, so what was cut and what was laid down still show.
        this.z0[k] += up * rises[k];
      }
    }

    // Tidy up: nothing negative.
    for (let k = 0; k < n; k++) {
      if (h[k] < 0) h[k] = 0;
      if (m[k] < 0) m[k] = 0;
      if (salt[k] < 0) salt[k] = 0;
      else if (salt[k] > h[k]) salt[k] = h[k];
      if (dye[k] < 0) dye[k] = 0;
      else if (dye[k] > h[k]) dye[k] = h[k];
    }
    this.t += dt;
  }
}

/**
 * A table run as a time lapse that a slider can scrub: `to(t)` runs forward
 * from where it is, or goes back to the latest saved state before `t` and
 * runs on from there. `schedule(table, t)` sets what changes with time (a dam
 * built or taken out, the rain turned on) before each step, so a replay
 * always comes out the same.
 */
export class Replay {
  table: Table;
  private snaps: Snapshot[] = [];
  private readonly make: () => Table;
  private readonly every: number;
  schedule: (table: Table, t: number) => void;

  constructor(make: () => Table, o: { every?: number; schedule?: (table: Table, t: number) => void } = {}) {
    this.make = make;
    this.table = make();
    this.every = o.every ?? 10;
    this.schedule = o.schedule ?? (() => {});
    this.snaps = [this.table.save()];
  }

  /** Start again from a fresh table (after the schedule or the setup changed). */
  reset(): void {
    this.table = this.make();
    this.snaps = [this.table.save()];
  }

  /** Bring the table to model time `t`. */
  to(t: number): Table {
    const tb = this.table;
    if (t < tb.t - 1e-9) {
      let s = this.snaps[0];
      for (const x of this.snaps) if (x.t <= t + 1e-9) s = x;
      tb.load(s);
      this.snaps = this.snaps.filter((x) => x.t <= s.t + 1e-9);
    }
    while (tb.t < t - tb.p.dt / 2) {
      this.schedule(tb, tb.t);
      tb.step();
      const last = this.snaps[this.snaps.length - 1];
      if (tb.t - last.t >= this.every - 1e-9) this.snaps.push(tb.save());
    }
    return tb;
  }
}

/** A smooth random field, 0 to 1, the same for the same seed: value noise in `octaves` layers. */
export function noise(seed: number, scale: number, octaves = 3): (x: number, y: number) => number {
  const hash = (x: number, y: number, o: number) => {
    let h = (x * 374761393 + y * 668265263 + (seed + o * 101) * 1442695041) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
  const smooth = (t: number) => t * t * (3 - 2 * t);
  return (x, y) => {
    let sum = 0;
    let amp = 1;
    let norm = 0;
    let f = 1 / scale;
    for (let o = 0; o < octaves; o++) {
      const X = x * f;
      const Y = y * f;
      const x0 = Math.floor(X);
      const y0 = Math.floor(Y);
      const sx = smooth(X - x0);
      const sy = smooth(Y - y0);
      const a = hash(x0, y0, o) + (hash(x0 + 1, y0, o) - hash(x0, y0, o)) * sx;
      const b = hash(x0, y0 + 1, o) + (hash(x0 + 1, y0 + 1, o) - hash(x0, y0 + 1, o)) * sx;
      sum += amp * (a + (b - a) * sy);
      norm += amp;
      amp /= 2;
      f *= 2;
    }
    return sum / norm;
  };
}
