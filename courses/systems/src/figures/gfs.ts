// Lesson 6, One master, a thousand disks: what the GFS master keeps, the
// control path apart from the data path (with the chunk size deciding how
// often the master is asked), and the memory the metadata needs.

import { svg } from 'didactics/dom';
import { line, redraw, small, still } from 'didactics/draw';
import { liveDiagram, type PartSpec } from './diagram';
import { COL, figure, frame, guessFirst, slider, toggles } from './kit';
import { Busy } from './slashdot';

/** Bytes of master memory per chunk: the GFS paper's "less than 64 bytes". */
export const PER_CHUNK = 64;

/** Chunks, and master memory in bytes, for `bytes` of data in blocks of `block` bytes. */
export function metadata(bytes: number, block: number) {
  const chunks = bytes / block;
  return { chunks, memory: chunks * PER_CHUNK };
}

/** Requests a second at the master when clients read `readsPerSec` 1 MB pieces and ask once per chunk of `chunkMB`. */
export const masterLoad = (readsPerSec: number, chunkMB: number) => readsPerSec / chunkMB;

const W = 440;
const READS = 10_000;
const MASTER_CAP = 2_000;

/** A size in bytes, in powers of 1000, to three figures: 256 MB, 1 PB. */
export function say(n: number): string {
  const b = Number(n.toPrecision(3));
  const f = (v: number) => Number(v.toPrecision(3)).toString();
  return b >= 1e15 ? `${f(b / 1e15)} PB` : b >= 1e12 ? `${f(b / 1e12)} TB` : b >= 1e9 ? `${f(b / 1e9)} GB` : b >= 1e6 ? `${f(b / 1e6)} MB` : `${f(b / 1e3)} KB`;
}
const sayCount = (n: number) => (n >= 1e9 ? `${Number((n / 1e9).toPrecision(2))} billion` : n >= 1e6 ? `${Number((n / 1e6).toPrecision(2))} million` : Math.round(n).toLocaleString('en-US'));

const BLOCKS = [4e3, 64e3, 1e6, 16e6, 64e6, 256e6];

export const FIGS = {
  'gfs-tables': () => {
    const s = still(W, 290);
    const mono = { attrs: { style: 'font-family: ui-monospace, Menlo, Consolas, monospace' } };
    const p: SVGElement[] = [
      svg('rect', { x: 8, y: 8, width: W - 16, height: 196, rx: 6, fill: 'none', stroke: COL.leader, 'stroke-width': 2 }),
      small(18, 26, 'The master, all in memory', { bold: true, fill: COL.leader }),
      small(18, 48, '1  Names: a sorted table of full paths', { bold: true }),
      small(36, 64, '/crawl/2003-04/part-00417  →  file', mono),
      small(18, 88, '2  Each file\'s chunks, in order', { bold: true }),
      small(36, 104, '/crawl/2003-04/part-00417  →  [2f1a, 2f1b, 2f1c, …]', mono),
      small(18, 128, '3  Where each chunk is (not saved: asked of the chunkservers)', { bold: true }),
      small(36, 144, '2f1a  →  version 7, on cs17, cs42, cs88', mono),
      small(18, 170, 'Tables 1 and 2 are also written to an operation log on disk,', { soft: true }),
      small(18, 186, 'copied to other machines before a change is acknowledged.', { soft: true }),
      small(18, 226, 'Chunkservers: ordinary Linux files of up to 64 MB each', { bold: true, fill: COL.data }),
    ];
    ['cs17', 'cs42', 'cs88'].forEach((n, i) => {
      const x = 24 + i * 140;
      p.push(svg('rect', { x, y: 236, width: 120, height: 42, rx: 4, fill: COL.paper, stroke: COL.data, 'stroke-width': 1.3 }));
      p.push(small(x + 8, 252, n, { ...mono, bold: true, fill: COL.data }), small(x + 8, 270, 'chunk 2f1a, v7', { ...mono, soft: true }));
    });
    s.svg.append(...p);
    return { node: s.node };
  },

  'gfs-flow': figure(['overload'], (ctx, t) => {
    let chunk = 64;
    let through = false;
    const SCALE = READS / 60;
    const cs = Array.from({ length: 6 }, (_, i) => `cs${i}`);
    const spec = () => {
      const parts: PartSpec[] = [
        { id: 'client', kind: 'client', label: 'Clients', x: 50, y: 150, rps: READS / SCALE, keys: 64_000, timeoutMs: 6000 },
        { id: 'master', kind: 'master', label: 'Master', x: 210, y: 40, serviceMs: 1000 / (MASTER_CAP / SCALE), queue: 40,
          policy: through ? { type: 'spread' } : { type: 'serve' } },
        ...cs.map((id, i): PartSpec => ({ id, kind: 'store', label: `Chunk ${i + 1}`, x: 370, y: 70 + i * 42, serviceMs: 30 })),
      ];
      const links = through
        ? [{ from: 'client', to: 'master', ms: 20 }, ...cs.map((id) => ({ from: 'master', to: id, ms: 15 }))]
        : [{ from: 'client', to: 'master', ms: 20 }, ...cs.map((id) => ({ from: 'client', to: id, ms: 20 }))];
      if (!through) parts[0].policy = { type: 'hash', ring: (k: number) => (k % chunk === 0 ? 'master' : cs[k % 6]) };
      return { parts, links, seed: 9 };
    };
    let busy = new Busy(3000);
    const d = liveDiagram(ctx, spec(), {
      w: W, h: 310, lines: 3, speed: 120,
      onFrame: (sys) => {
        const u = busy.sample(sys).get('master') ?? 0;
        const load = through ? READS : masterLoad(READS, chunk);
        d.f.readout.textContent = through
          ? `Every read passes through the master: ${READS.toLocaleString('en-US')} a second and 10 GB a second of data through one machine. It is ${Math.round(u * 100)}% busy and turning requests away.`
          : `Clients read 10 GB a second in 1 MB pieces and ask the master once per ${chunk} MB chunk: ${Math.round(load).toLocaleString('en-US')} requests a second, ${Math.round((load / MASTER_CAP) * 100)}% of the 2,000 it can answer. The data goes straight to the chunkservers.`;
        if (u > 0.9 && t.goal === 'overload') t.done();
      },
    });
    const cs1 = slider('Chunk size', { steps: [1, 4, 16, 64, 256], value: chunk, show: (v) => `${v} MB`, onInput: (v) => { chunk = v; d.rebuild(spec()); busy = new Busy(3000); }, color: 'data' });
    const tg = toggles(['Data through the master'], [false], ([on]) => { through = on; d.rebuild(spec()); busy = new Busy(3000); });
    d.f.controls.append(cs1.node, tg.node);
    return d.f.node;
  }),

  'gfs-estimate': figure(['guess'], (_ctx, t) => {
    const f = frame(W, 236, 3);
    const g = svg('g');
    f.svg.append(g);
    let data = 1e15;
    const x0 = 96;
    const x1 = W - 16;
    const lo = 6;
    const hi = 15;
    const X = (b: number) => x0 + ((Math.log10(b) - lo) / (hi - lo)) * (x1 - x0);
    const paint = () => {
      const parts: SVGElement[] = [small(x0, 14, `Master memory for ${say(data)}, by block size`, { bold: true })];
      for (const [v, s] of [[1e6, '1 MB'], [1e9, '1 GB'], [1e12, '1 TB'], [1e15, '1 PB']] as const) {
        parts.push(line(X(v), 22, X(v), 190, COL.grid, 1), small(X(v), 204, s, { anchor: 'middle', soft: true }));
      }
      BLOCKS.forEach((b, i) => {
        const y = 26 + i * 27;
        const m = metadata(data, b).memory;
        parts.push(small(x0 - 8, y + 12, say(b), { anchor: 'end', bold: b === 64e6 }));
        if (!open() && b === 64e6) {
          parts.push(small(x0 + 4, y + 12, '?', { bold: true, fill: COL.leader }));
          return;
        }
        const w = Math.max(2, X(Math.max(m, 1e6)) - x0);
        parts.push(svg('rect', { x: x0, y: y + 3, width: w, height: 14, rx: 2, fill: COL.leader, opacity: b === 64e6 ? 0.95 : 0.55 }));
        parts.push(small(x0 + w + 4, y + 14, say(m), { bold: b === 64e6, fill: COL.leader }));
      });
      parts.push(
        line(X(4e9), 22, X(4e9), 190, COL.soft, 1.5, { 'stroke-dasharray': '4 3' }), small(X(4e9) + 3, 224, 'a 2003 server', { fill: COL.soft }),
        line(X(1e12), 22, X(1e12), 190, COL.soft, 1.5, { 'stroke-dasharray': '4 3' }), small(X(1e12) + 3, 224, 'a big 2026 server', { fill: COL.soft }),
      );
      redraw(g, ...parts);
      if (open()) {
        const m = metadata(data, 64e6);
        f.readout.textContent = `${say(data)} ÷ 64 MB = ${sayCount(m.chunks)} chunks × 64 bytes = ${say(m.memory)} of master memory. In 4 KB blocks the same data needs ${say(metadata(data, 4e3).memory)}.`;
      }
    };
    const ds = slider('Data stored', { min: 1e14, max: 1e17, value: data, scale: 'log', show: (v) => say(Number(v.toPrecision(2))), onInput: (v) => { data = v; paint(); }, color: 'data' });
    f.controls.append(ds.node);
    const open = guessFirst(t, f, {
      ask: 'The master keeps under 64 bytes for each 64 MB chunk. About how much memory does it need for a petabyte of files?',
      options: ['About 1 GB', 'About 100 GB', 'About 10 TB'],
      answer: 0,
      sliders: [ds],
      after: () => {
        paint();
        if (t.goal === 'guess') t.done();
      },
    });
    paint();
    return f.node;
  }),
};

