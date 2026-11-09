// The course's photos (src/data/photos.json, written by the root's tools/photos.mjs
// from tools/photo-picks.json), and how one is shown: the picture with its credit.

import { el } from 'didactics/dom';
import { photoFigure, stillPhoto, type Photo } from 'didactics/photos';
import list from './data/photos.json';
import { asset } from './asset';

export interface CoursePhoto extends Photo {
  /** What it shows, for the alt text and the Credits page. */
  about: string;
  /** Its path next to the page. */
  file: string;
}

export const PHOTOS = list as CoursePhoto[];

export const photoById = (id: string): CoursePhoto | undefined => PHOTOS.find((p) => p.id === id);

/** Where a photo's file is: next to the page, or on the live site when opened from disk. */
const src = (p: CoursePhoto) => asset(p.file);

/** A photo at the column's width, cropped to `aspect` (width / height) if given, with its credit under it (didactics/photos). */
export function photoNode(id: string, o: { aspect?: number; alt?: string; position?: string } = {}): HTMLElement {
  const p = photoById(id);
  if (!p) return el('p.fig-readout', {}, `No photo "${id}".`);
  return photoFigure(p, src(p), { ...o, loading: 'lazy' });
}

/** The figure a lesson names a photo in by id: { "type": "diagram", "id": "photo", "options": { "photo": "willow", "aspect": 1.5 } }. */
export const photoStill = stillPhoto<CoursePhoto>({ find: photoById, src });
