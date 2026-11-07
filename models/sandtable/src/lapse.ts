// A sand table run as a time lapse in a lesson figure: a time slider with a
// Play button scrubs a replay of the model, so the same settings always give
// the same picture, and a test can move the slider to any time. The course
// passes its own slider (coloured from its palette) and its colours.

import { frame, player, type FigureContext, type Player, type Slider } from 'didactics/figure';
import { Replay, type Table } from './table';
import { tableView, type TableColors, type TableView } from './view';

export interface SandLapse {
  view: TableView;
  replay: Replay;
  node: HTMLElement;
  controls: HTMLElement;
  readout: HTMLElement;
  time: Slider;
  play: Player;
  /** Model time now. */
  now: () => number;
  /** Bring the table to the slider's time and paint it. */
  draw: () => void;
  /** Start the replay again (the setup changed) and come back to the same time. */
  restart: () => void;
}

export interface LapseOptions {
  /** The course's slider: (label, min, max, step, value, show, onInput) => Slider. */
  slider: (label: string, min: number, max: number, step: number, value: number, show: (v: number) => string, onInput: (v: number) => void) => Slider;
  colors: TableColors;
  make: () => Table;
  schedule?: (t: Table, time: number) => void;
  /** The model time the slider runs to, and how the slider shows a time. */
  end: number;
  show: (time: number) => string;
  label?: string;
  /** Lines in the text box. */
  lines: number;
  /** Draw the overlay and the readout after each move of the slider. */
  paint: (t: Table) => void;
  seconds?: number;
  heights: [number, number];
  salt?: boolean;
  width?: number;
}

export function sandLapse(ctx: FigureContext, o: LapseOptions): SandLapse {
  const replay = new Replay(o.make, { every: o.end / 40, schedule: o.schedule });
  const first = replay.table;
  const view = tableView(first.nx, first.ny, { width: o.width ?? 400, colors: o.colors, heights: o.heights, salt: o.salt });
  const f = frame({ drawing: view.node, lines: o.lines });
  let now = 0;
  const draw = () => {
    const t = replay.to(now);
    view.paint(t);
    o.paint(t);
  };
  const time = o.slider(o.label ?? 'Time', 0, o.end, o.end / 400, 0, o.show, (v) => {
    now = v;
    draw();
  });
  const play = player(time, ctx, { seconds: o.seconds ?? 14 });
  f.controls.append(play.node, time.node);
  return {
    view,
    replay,
    node: f.node,
    controls: f.controls,
    readout: f.readout,
    time,
    play,
    now: () => now,
    draw,
    restart: () => {
      replay.reset();
      draw();
    },
  };
}

/** Sand laid down (above the starting ground) over the cells where `where(i, j)` holds; works are left out. */
export function laidDown(t: Table, where: (i: number, j: number) => boolean): number {
  let sum = 0;
  for (let j = 0; j < t.ny; j++) {
    for (let i = 0; i < t.nx; i++) {
      const k = j * t.nx + i;
      if (t.works[k] || !where(i, j)) continue;
      const d = t.z[k] - t.z0[k];
      if (d > 0) sum += d;
    }
  }
  return sum;
}

/** Two hex colours mixed: `t` of the way from `a` to `b`. */
export function mixHex(a: string, b: string, t: number): string {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [x, y] = [p(a), p(b)];
  return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join('');
}
