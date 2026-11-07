// Each diagram id the lessons name, to its code. The charts (timeline, tree,
// scale, plate) and the map are drawn from a lesson's JSON alone.

import { charts } from 'didactics/charts';
import { liveCharts } from 'didactics/live-charts';
import type { FigureFactory } from 'didactics/figure';
import { maps } from 'didactics/maps';
import { asset } from '../asset';
import { photoById } from '../photos';
import { burialFigure, rootsFigure, squeezeFigure } from './barrow';
import { columnsFigure, furnaceFigure } from './basalt';
import { checkFigure } from './check';
import { COL } from './kit';
import { photoFigure } from './photo';
import { bioStill } from './bio';
import { duneFigure, sortFigure } from './dunes';
import { correlateFigure, veesFigure } from './smith';
import { unconformityFigure } from './siccar';
import { bowenFigure, conditionsFigure, igneousStill } from './families';
import { coolingFigure, decayFigure, leadLineFigure } from './age';
import { fitFigure, gondwanaIceFigure, gondwanaStill, openingFigure } from './drift';
import { ridgeFigure } from './stripes';
import { platesMap, slabFigure } from './quakes';
import { atollFigure, driftMapFigure, plumeFigure } from './hotspot';
import { dipFigure, iapetusFigure, seaLevelFigure, supercontinentsFigure, wilsonStill } from './supercontinents';
import { knickFigure, raceFigure, sawFigure } from './rivers';
import { glacierFigure } from './ice';
import { iceSheetsFigure, rhoneMapFigure } from './iceage';
import { cyclesFigure, orbitFigure, recordFigure } from './pacemaker';
import { kettleStill, reboundFigure, sunFigure } from './kettles';
import { orderFigure, settleFigure, toothStill } from './steno';
import { countFigure, impactFigure, mixFigure, oceanFigure } from './moon';
import { cellsFigure, fossilFigure } from './fossils';
import { fenceFigure, groundFigure, stickFigure } from './faults';
import { columnFigure, conduitFigure } from './volcano';
import { barnacleStill, megathrustFigure } from './megathrust';
import { bedsFigure, bergsFigure, cataractFigure, damFigure, missoulaFigure, spillFigure } from './floods';
import { blastFigure, laharFigure, marshFigure, pacificFigure } from './cascadia';
import { bluffFigure, liquefyFigure, lobeFigure, seattleFaultFigure } from './seattle';
import { accreteFigure, bluffBuilderFigure, driftCellFigure, soilWaterFigure, trenchFigure } from './whidbey';
import { drillFigure, earthStill, epicentreFigure, innerFigure, layersFigure, mohoFigure, plumbFigure, raysFigure, wavesStill } from './deep';

export const FIGURES: Readonly<Record<string, FigureFactory>> = {
  ...charts({ palette: COL, asset }),
  ...liveCharts({ palette: COL, asset, photos: { find: photoById, src: (p) => asset(p.file) } }),
  ...maps({ palette: COL, asset }),
  photo: photoFigure,
  bio: bioStill,
  check: checkFigure,
  // Lesson 1
  tooth: toothStill,
  settle: settleFigure,
  order: orderFigure,
  // Lesson 2
  sorting: sortFigure,
  dune: duneFigure,
  // Lesson 3
  correlate: correlateFigure,
  vees: veesFigure,
  // Lesson 4
  furnace: furnaceFigure,
  columns: columnsFigure,
  // Lesson 5
  burial: burialFigure,
  squeeze: squeezeFigure,
  roots: rootsFigure,
  // Lesson 6
  conditions: conditionsFigure,
  'igneous-grid': igneousStill,
  bowen: bowenFigure,
  // Lesson 7
  unconformity: unconformityFigure,
  // Lesson 8
  cooling: coolingFigure,
  decay: decayFigure,
  'lead-line': leadLineFigure,
  // Lesson 9
  fit: fitFigure,
  'gondwana-ice': gondwanaIceFigure,
  gondwana: gondwanaStill,
  // Lesson 10
  ridge: ridgeFigure,
  opening: openingFigure,
  // Lesson 11
  plates: platesMap,
  slab: slabFigure,
  // Lesson 12
  plume: plumeFigure,
  atoll: atollFigure,
  'island-drift': driftMapFigure,
  // Lesson 13
  iapetus: iapetusFigure,
  dip: dipFigure,
  supercontinents: supercontinentsFigure,
  wilson: wilsonStill,
  'sea-level': seaLevelFigure,
  // Lesson 14
  race: raceFigure,
  knick: knickFigure,
  saw: sawFigure,
  // Lesson 15
  glacier: glacierFigure,
  'rhone-ice': rhoneMapFigure,
  // Lesson 16
  orbit: orbitFigure,
  record: recordFigure,
  cycles: cyclesFigure,
  // Lesson 17
  sun: sunFigure,
  rebound: reboundFigure,
  'ice-sheets': iceSheetsFigure,
  kettle: kettleStill,
  // Lesson 18
  fence: fenceFigure,
  'stick-slip': stickFigure,
  shaking: groundFigure,
  // Lesson 19
  conduit: conduitFigure,
  column: columnFigure,
  // Lesson 20
  megathrust: megathrustFigure,
  barnacles: barnacleStill,
  // F, the ice age floods
  spillover: spillFigure,
  cataract: cataractFigure,
  'ice-dam': damFigure,
  'lake-missoula': missoulaFigure,
  'flood-beds': bedsFigure,
  icebergs: bergsFigure,
  // C, Cascadia
  marsh: marshFigure,
  'orphan-tsunami': pacificFigure,
  lahar: laharFigure,
  blast: blastFigure,
  // W, Whidbey
  'bluff-builder': bluffBuilderFigure,
  'soil-water': soilWaterFigure,
  'drift-cell': driftCellFigure,
  accrete: accreteFigure,
  trench: trenchFigure,
  // S, Seattle
  'puget-lobe': lobeFigure,
  'seattle-fault': seattleFaultFigure,
  bluff: bluffFigure,
  liquefy: liquefyFigure,
  // P, the Moon
  impact: impactFigure,
  'crater-count': countFigure,
  'magma-ocean': oceanFigure,
  'moon-mix': mixFigure,
  // L, fossils
  fossilize: fossilFigure,
  cells: cellsFigure,
  // D, deep Earth
  plumb: plumbFigure,
  layers: layersFigure,
  epicentre: epicentreFigure,
  waves: wavesStill,
  moho: mohoFigure,
  rays: raysFigure,
  'inner-core': innerFigure,
  earth: earthStill,
  drill: drillFigure,
};
