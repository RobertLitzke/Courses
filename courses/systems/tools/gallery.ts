// Every figure on one page, with its caption from the lessons, for checking
// drawings without playing through: `npm run dev -w systems`, then open
// /figures.html (?only=<id> for one; ?frozen for the same picture every load).
// Only the dev server serves it; the build ships index.html alone.

import 'didactics/frozen';
import 'didactics/styles/kit.css';
import '../src/styles/tokens.css';
import { galleryPage } from 'didactics/gallery';
import { emptyProgress } from 'didactics/progress';
import { FIGURES } from '../src/figures';
import { WRITTEN } from '../src/lessons';

const save = emptyProgress(location.search.includes('metric') ? 'metric' : 'imperial', { radio: false });
document.getElementById('app')!.append(galleryPage({ figures: FIGURES, lessons: WRITTEN, save }).node);
