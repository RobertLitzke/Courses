// Drawing a sand table: the ground lit from the north-west, coloured from
// low to high, with new sand laid down in its own colour and works (dams) in
// theirs; water over it, fresh or salt, muddy or dyed, by how deep it is. A
// canvas under an SVG for labels, the same size. The colours come from the
// course, so they keep their meaning there.

import { el, svg } from 'didactics/dom';
import type { Table } from './table';

export interface TableColors {
  /** Ground, low and high. */
  low: string;
  high: string;
  /** Sand laid down since the start. */
  sand: string;
  /** Fresh water and sea water. */
  water: string;
  salt: string;
  /** Dams and other works. */
  works: string;
  /** Dye, for following water. */
  dye?: string;
}

export interface ViewOptions {
  /** Width in drawing units (the overlay's viewBox); the height follows the grid. */
  width: number;
  colors: TableColors;
  /** Ground heights for the low and high colours. */
  heights: [number, number];
  /** Steepen the shading. */
  relief?: number;
  /** How much a little sand in the water browns it (0 for none). */
  mud?: number;
  /** Show salt (else all water is drawn fresh). */
  salt?: boolean;
  /** How thick new sand must be to show in its colour. */
  laid?: number;
}

export interface TableView {
  node: HTMLElement;
  canvas: HTMLCanvasElement;
  overlay: SVGSVGElement;
  w: number;
  h: number;
  paint(table: Table): void;
  /** Drawing units at the centre of a cell. */
  xy(i: number, j: number): [number, number];
  /** The cell under a point on screen, if any. */
  cellAt(clientX: number, clientY: number): [number, number] | null;
}

const rgb = (hex: string): [number, number, number] => {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? [...h].map((c) => c + c).join('') : h.slice(0, 6);
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const mix = (a: readonly number[], b: readonly number[], t: number, out: number[]) => {
  out[0] = a[0] + (b[0] - a[0]) * t;
  out[1] = a[1] + (b[1] - a[1]) * t;
  out[2] = a[2] + (b[2] - a[2]) * t;
  return out;
};

export function tableView(nx: number, ny: number, o: ViewOptions): TableView {
  const w = o.width;
  const h = Math.round((w * ny) / nx);
  const scale = 2;
  const canvas = el('canvas', { width: w * scale, height: h * scale, role: 'img' }) as HTMLCanvasElement;
  canvas.setAttribute('style', 'display:block;width:100%;height:auto;border-radius:4px;touch-action:none');
  canvas.style.aspectRatio = `${w} / ${h}`;
  const overlay = svg('svg', { viewBox: `0 0 ${w} ${h}`, style: 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;overflow:visible' }) as SVGSVGElement;
  const node = el('div.sandtable', { style: 'position:relative' }, canvas, overlay);
  const ctx = canvas.getContext?.('2d') ?? null;
  const off = typeof document !== 'undefined' ? (document.createElement('canvas') as HTMLCanvasElement) : null;
  if (off) {
    off.width = nx;
    off.height = ny;
  }
  const octx = off?.getContext?.('2d') ?? null;
  const img = octx ? octx.createImageData(nx, ny) : null;

  const C = {
    low: rgb(o.colors.low),
    high: rgb(o.colors.high),
    sand: rgb(o.colors.sand),
    water: rgb(o.colors.water),
    salt: rgb(o.colors.salt),
    works: rgb(o.colors.works),
    dye: rgb(o.colors.dye ?? o.colors.water),
  };
  const [lo, hi] = o.heights;
  const relief = o.relief ?? 1;
  const mud = o.mud ?? 4;
  const laid = o.laid ?? 0.04;
  // Light from the north-west, a little above the horizon.
  const lx = -0.6, ly = -0.6, lz = 0.53;
  const flat = lz / Math.hypot(lx, ly, lz);
  const ground = [0, 0, 0];
  const wc = [0, 0, 0];

  const paint = (t: Table) => {
    if (!ctx || !octx || !img || !off) return;
    const d = img.data;
    const { z, z0, works } = t;
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        const k = j * nx + i;
        const zl = z[i > 0 ? k - 1 : k];
        const zr = z[i < nx - 1 ? k + 1 : k];
        const zu = z[j > 0 ? k - nx : k];
        const zd = z[j < ny - 1 ? k + nx : k];
        const gx = ((zr - zl) / 2) * relief * 2;
        const gy = ((zd - zu) / 2) * relief * 2;
        const shade = (-gx * lx - gy * ly + lz) / Math.hypot(gx, gy, 1) / Math.hypot(lx, ly, lz);
        const light = 1 + (shade - flat) * 1.3;
        if (works[k]) {
          ground[0] = C.works[0];
          ground[1] = C.works[1];
          ground[2] = C.works[2];
        } else {
          mix(C.low, C.high, Math.max(0, Math.min(1, (z[k] - lo) / (hi - lo))), ground);
          const added = z[k] - z0[k];
          if (added > laid) mix(ground, C.sand, Math.min(0.85, (added - laid) * 4 + 0.35), ground);
        }
        let r = ground[0] * light;
        let g = ground[1] * light;
        let b = ground[2] * light;
        const depth = t.h[k];
        const dyed = o.colors.dye ? t.dyeAt(k) : 0;
        if (depth > 0.0005 && dyed > 0.05) {
          // Dyed water shows even as a film, so its path can be followed.
          const a = Math.min(0.95, 0.45 + dyed * 0.6);
          r = r * (1 - a) + C.dye[0] * a;
          g = g * (1 - a) + C.dye[1] * a;
          b = b * (1 - a) + C.dye[2] * a;
        } else if (depth > 0.01) {
          mix(C.water, C.salt, o.salt ? t.saltiness(k) : t.sea[k] ? 1 : 0, wc);
          if (mud) mix(wc, C.sand, Math.min(0.6, t.muddiness(k) * mud), wc);
          const dye = t.dyeAt(k);
          if (dye > 0.01) mix(wc, C.dye, Math.min(1, dye * 1.6), wc);
          const a = Math.min(0.88, 0.45 + depth * 0.4);
          r = r * (1 - a) + wc[0] * a;
          g = g * (1 - a) + wc[1] * a;
          b = b * (1 - a) + wc[2] * a;
        }
        d[k * 4] = r;
        d[k * 4 + 1] = g;
        d[k * 4 + 2] = b;
        d[k * 4 + 3] = 255;
      }
    }
    octx.putImageData(img, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(off, 0, 0, canvas.width, canvas.height);
  };

  return {
    node,
    canvas,
    overlay,
    w,
    h,
    paint,
    xy: (i, j) => [((i + 0.5) / nx) * w, ((j + 0.5) / ny) * h],
    cellAt: (x, y) => {
      const r = canvas.getBoundingClientRect();
      if (!r.width || !r.height) return null;
      const i = Math.floor(((x - r.left) / r.width) * nx);
      const j = Math.floor(((y - r.top) / r.height) * ny);
      return i >= 0 && i < nx && j >= 0 && j < ny ? [i, j] : null;
    },
  };
}
