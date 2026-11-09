// The system diagrams (models/sysdiagram) in this course's colours, and the
// pieces most figures share: a live diagram in a figure frame, running in
// slow motion so the requests can be followed, with a readout of how the
// requests are doing.

import type { FigureContext } from 'didactics/figure';
import { System, type Stats, type SystemSpec } from 'sysdiagram/model';
import { systemView, type DiagramColors, type Group, type SystemView, type ViewOptions } from 'sysdiagram/view';
import type { SequenceColors } from 'sysdiagram/sequence';
import { duration, round } from 'sysdiagram/numbers';
import { animate, COL, frame, type Frame } from './kit';

export { System } from 'sysdiagram/model';
export type { PartSpec, LinkSpec, Part, Policy, Stats } from 'sysdiagram/model';

/** The diagram colours: blue requests, green answers, red failures, amber load. */
export const DIAGRAM: DiagramColors = {
  ink: COL.ink,
  soft: COL.soft,
  paper: COL.paper,
  request: COL.request,
  answer: COL.answer,
  error: COL.error,
  busy: COL.busy,
  fill: { cache: '#e6f4f4', master: '#f5e8f1', db: '#eeebf6', replica: '#eeebf6', shard: '#eeebf6', store: '#eeebf6', queue: '#fbf1e2' },
};

export const SEQUENCE: SequenceColors = { ink: COL.ink, soft: COL.soft, error: COL.error, paper: COL.paper };

export interface LiveDiagram {
  f: Frame;
  sys: System;
  view: SystemView;
  /** Build the system again from a new spec (a slider that changes its shape), keeping the frame. */
  rebuild: (spec: SystemSpec) => void;
}

export interface LiveOptions extends Omit<ViewOptions, 'colors'> {
  /** Drawing size. */
  w: number;
  h: number;
  /** Lines of readout. Default 3. */
  lines?: number;
  /** Milliseconds of the system's clock per second on screen. Default 250 (slow motion). */
  speed?: number;
  /** Called each frame, after the step; write the readout here. */
  onFrame?: (sys: System) => void;
  /** Groups behind the parts. */
  groups?: Group[];
}

/** A live system diagram in a figure frame, stepping while on screen. */
export function liveDiagram(ctx: FigureContext, spec: SystemSpec, o: LiveOptions): LiveDiagram {
  const f = frame(o.w, o.h, o.lines ?? 3);
  const layer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  f.svg.append(layer);
  const make = (s: SystemSpec) => {
    while (layer.firstChild) layer.firstChild.remove();
    const sys = new System(s);
    const view = systemView(sys, layer, { ...o, colors: DIAGRAM });
    return { sys, view };
  };
  const out: LiveDiagram = { f, ...make(spec), rebuild: (s) => Object.assign(out, make(s)) };
  // One loop for the figure's life, stepping whichever system it holds now.
  animate(f.svg, ctx, (dt) => {
    out.sys.run(dt * (o.speed ?? 250));
    out.view.draw();
    o.onFrame?.(out.sys);
  });
  return out;
}

/** "120 a second answered, median 24 ms, 99th 180 ms, 3% failed." */
export function statsLine(s: Stats): string {
  if (!s.count) return 'Waiting for the first answers.';
  const parts = [`${round(s.goodput, 2)} answered a second`];
  if (Number.isFinite(s.p50)) parts.push(`median ${duration(s.p50)}`, `99th percentile ${duration(s.p99)}`);
  parts.push(s.errors > 0 ? `${Math.round(s.errors * 100)}% failed` : 'none failed');
  return `${parts.join(', ')}.`;
}
