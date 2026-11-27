// Progress and settings, in localStorage, as Didactics' courseStore makes them
// from the course's settings (didactics/progress for the fields and their
// repair). Inches and feet by default, as on most seed packets in the US; metric is a setting away.

import { courseStore } from 'didactics/app';

export const { store, empty } = courseStore('dirt', { key: 'dirt.save', units: 'imperial' });
