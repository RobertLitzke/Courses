// Where files that are not inlined (photos) come from: next to the page on the
// site, or from the site when the page was opened from disk.

import { assetFrom } from 'didactics/asset';

// The live site, from `homepage` in the repository's package.json (passed in by
// tools/build-site.mjs). Only a copy opened from disk uses it; on the site every
// path is relative. Unset (a course built on its own), that copy has no photos.
const site: string | undefined = import.meta.env.VITE_SITE_URL;
export const SITE_URL = site ? `${site}systems/` : undefined;

export const asset = assetFrom(SITE_URL ?? '');
