// Progress and settings, in localStorage, as Didactics' courseStore makes them
// from the course's settings (didactics/progress for the fields and their
// repair). Electronics is metric throughout.

import { courseStore } from 'didactics/app';

export const { store, empty } = courseStore('circuitry', { key: 'circuitry.save', units: 'metric', fixedUnits: true });
