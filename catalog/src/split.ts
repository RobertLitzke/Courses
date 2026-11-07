// A bridge's icon: one square cut corner to corner, the first course's icon
// in the upper left half and the second's in the lower right, so a bridge
// reads as one thing that belongs to both. Each half is zoomed a little
// towards its own corner so the middle of its picture shows (catalog.css,
// .split).

import { el } from 'didactics/dom';

export interface Iconed {
  icon: string;
  title: string;
}

/** The split icon of a bridge between `a` and `b`. `coming` draws it as in preparation. */
export function splitIcon(a: Iconed, b: Iconed, coming = false): HTMLElement {
  return el(
    `span.split${coming ? '.coming' : ''}`,
    { role: 'img', 'aria-label': `${a.title} and ${b.title}` },
    el('img.split-a', { src: a.icon, alt: '' }),
    el('img.split-b', { src: b.icon, alt: '' }),
  );
}
