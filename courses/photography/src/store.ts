// Progress and settings, in localStorage, as Didactics' courseStore makes them
// from the course's settings (didactics/progress for the fields and their
// repair). Metres by default: lens and sensor sizes are metric whatever you measure a field in. Feet are a setting away. The key predates the course's id and must not change: it is where everyone's progress is.

import { courseStore } from 'didactics/app';

export const { store, empty } = courseStore('out-of-auto', { key: 'outofauto.save', units: 'metric' });
