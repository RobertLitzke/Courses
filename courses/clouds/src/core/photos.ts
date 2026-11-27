// The photo library. tools/photos/fetch.ts writes src/data/photos.json and the
// files in public/photos/; this is the shape of that file and the rules every
// entry must keep. Every photo carries its author, licence and source, and the
// app shows them under the photo and on the Credits page.

import { isGenusId, type GenusId } from './clouds';
import { photoProblems, type Photo as Credited } from 'didactics/photos';
import type { Rng } from 'didactics/rng';

// The licences (public domain and attribution only), the credit fields and
// their checks are Didactics' (didactics/photos); what a photo is of is ours.
export { isLicenseId, LICENSES, type LicenseId } from 'didactics/photos';

/** The rare clouds: sights the lessons point out, with a card of their own in the field guide. */
export const FEATURES = ['lenticularis', 'mammatus', 'fluctus'] as const;
export type FeatureId = (typeof FEATURES)[number];

export interface Photo extends Credited {
  /**
   * Stable id, such as cumulus-01. It is the photo's only name: the file is
   * photos/<id>.webp (see photoFile), and lessons and the quiz name photos by it.
   */
  id: string;
  genus: GenusId;
  /**
   * Set when the photo is of a rare cloud. It is shown on that cloud's own
   * card and kept out of the everyday lesson checks, where a lens
   * cloud filed as altocumulus would be an unfair call.
   */
  feature?: FeatureId;
  /**
   * Set when the photo must not be shown mirrored: it has writing in it, or a
   * landmark someone would know. Every other photo is flipped left to right
   * half the time, so the same few photos make more different-looking cards.
   */
  noMirror?: true;
}

/** What is wrong with an entry, or an empty list if nothing is. */
export function problems(p: Partial<Photo>): string[] {
  const out = photoProblems(p);
  if (!p.genus || !isGenusId(p.genus)) out.push(`unknown genus ${p.genus}`);
  if (p.noMirror !== undefined && p.noMirror !== true) out.push('noMirror must be true or left out');
  if (p.feature !== undefined && !FEATURES.includes(p.feature)) out.push(`unknown rare cloud ${p.feature}`);
  return out;
}

/** The photo's file, relative to the page: photos/<id>.webp. */
export function photoFile(p: Pick<Photo, 'id'>): string {
  return `photos/${p.id}.webp`;
}

/** The everyday photos of a genus: the rare clouds are left out. */
export function photosOf(library: readonly Photo[], id: GenusId): Photo[] {
  return library.filter((p) => p.genus === id && !p.feature);
}

/** Whether to show this photo mirrored this time. */
export function mirrorFor(p: Photo, rng: Rng): boolean {
  return !p.noMirror && rng() < 0.5;
}

export function photosOfFeature(library: readonly Photo[], id: FeatureId): Photo[] {
  return library.filter((p) => p.feature === id);
}
