// Every figure on one page, with its caption from the lessons, for checking
// drawings without playing through: `npm run dev -w synthesizers`, then open
// /figures.html (?only=<id> for one; ?frozen for the same picture every load).
// Only the dev server serves it; the build ships index.html alone.

import 'didactics/frozen';
import 'didactics/styles/kit.css';
import '../src/game/styles/app.css';
import '../src/styles/tokens.css';
import { galleryPage } from 'didactics/gallery';
import { emptyProgress } from 'didactics/progress';
import { FIGURES } from '../src/figures';
import { WRITTEN } from '../src/lessons';

const save = emptyProgress('metric');
// Every live synth too, not only the first: each block is a different panel and goal.
const synth = Object.assign((...a: Parameters<typeof FIGURES.synth>) => FIGURES.synth(...a), FIGURES.synth, { each: true as const });
document.getElementById('app')!.append(galleryPage({ figures: { ...FIGURES, synth }, lessons: WRITTEN, save }).node);
