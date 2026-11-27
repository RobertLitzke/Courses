// Naming the photos in the check that ends a lesson: a photo (or a drawing)
// is called in by name. Wrong answers are the clouds it is really mistaken for, as in Syrinx:
// a cirrostratus against cumulus and stratus would be a free mark.

import { GENERA, genus, type GenusId } from './clouds';
import type { Photo } from './photos';
import { shuffle, type Rng } from 'didactics/rng';
import { dealFloorCalls } from './photo-call';

export interface NameCall {
  genus: GenusId;
  photo: Photo | null;
  mirrored: boolean;
  options: GenusId[];
}

/**
 * Options are the answer plus up to `size - 1` look-alikes: first the genus's
 * own confusions that are in `known`, then other known genera, then any genus.
 */
export function nameOptions(id: GenusId, known: readonly GenusId[], size: number, rng: Rng): GenusId[] {
  const picks: GenusId[] = [];
  const add = (g: GenusId) => {
    if (g !== id && !picks.includes(g) && picks.length < size - 1) picks.push(g);
  };
  genus(id).confused.filter((g) => known.includes(g)).forEach(add);
  shuffle(known, rng).forEach(add);
  shuffle(GENERA.map((g) => g.id), rng).forEach(add);
  return shuffle([id, ...picks], rng);
}

export function dealNameCalls(pool: readonly GenusId[], known: readonly GenusId[], library: readonly Photo[], count: number, size: number, rng: Rng): NameCall[] {
  return dealFloorCalls(pool, library, count, rng).map((c) => ({
    genus: c.genus,
    photo: c.photo,
    mirrored: c.mirrored,
    options: nameOptions(c.genus, known, size, rng),
  }));
}
