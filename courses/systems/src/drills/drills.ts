// The design drills: open problems to work through after the lessons, each
// with the questions that change the design, a live estimate of its numbers,
// what a complete design covers, the follow-ups that test it, and the lessons
// it draws on. The page that shows them is ./view.ts.

import { sig } from '../figures/kit';
import type { ColorKey } from '../figures/kit';

/** One slider in a drill's estimate. */
export interface DrillInput {
  key: string;
  label: string;
  /** The values it walks through, in order. */
  steps: readonly number[];
  value: number;
  show: (v: number) => string;
  color: ColorKey;
}

/** A question worth asking first, and what its answer changes. */
export interface Ask {
  ask: string;
  changes: string;
}

/** A follow-up question, and a short note on where a good answer goes. */
export interface FollowUp {
  ask: string;
  hint: string;
}

export interface Drill {
  id: string;
  title: string;
  /** The problem as it is put, in two or three sentences. */
  prompt: string;
  asks: readonly Ask[];
  /** The estimate: its sliders, and the lines it reports for a setting of them. */
  inputs: readonly DrillInput[];
  estimate: (v: Record<string, number>) => string[];
  /** What a complete design covers; the reader ticks what theirs did. */
  covers: readonly string[];
  followUps: readonly FollowUp[];
  /** Lesson ids, in the order the drill uses them. */
  lessons: readonly string[];
}

// ---------------------------------------------------------------------------
// Formatting.

const n = (v: number) => sig(v, 2);
/** Bytes from terabytes, in the largest unit that keeps the number readable. */
export function bytes(tb: number): string {
  if (tb >= 1e6) return `${sig(tb / 1e6, 2)} EB`;
  if (tb >= 1e3) return `${sig(tb / 1e3, 2)} PB`;
  if (tb >= 1) return `${sig(tb, 2)} TB`;
  if (tb >= 1e-3) return `${sig(tb * 1e3, 2)} GB`;
  return `${sig(tb * 1e6, 2)} MB`;
}
const pct = (v: number) => `${sig(v * 100, 2)}%`;
const money = (v: number) => (v >= 1e6 ? `$${sig(v / 1e6, 2)} million` : `$${Math.round(v).toLocaleString('en-US')}`);
const times = (v: number) => `${n(v)} ×`;

/** Steps of 1, 2 and 5 in each power of ten from lo to hi. */
const LOG = (lo: number, hi: number): number[] => {
  const out: number[] = [];
  for (let p = 10 ** Math.floor(Math.log10(lo)); p <= hi; p *= 10)
    for (const m of [1, 2, 5]) if (m * p >= lo && m * p <= hi) out.push(m * p);
  return out;
};
const RANGE = (lo: number, hi: number, step: number): number[] => {
  const out: number[] = [];
  for (let v = lo; v <= hi + step / 2; v += step) out.push(Number(v.toFixed(6)));
  return out;
};

// ---------------------------------------------------------------------------
// The drills.

/** A 10 Gb/s link, run all day: about 108 TB. */
const LINK_TB_DAY = (10e9 / 8) * 86_400 / 1e12;

export const DRILLS: readonly Drill[] = [
  {
    id: 'fleet-logs',
    title: 'Logs from a fleet, and finding a scenario in them',
    prompt: 'A fleet of vehicles carries cameras and laser scanners and records far more data than its network connections can carry. Design the system that brings the data home, stores it for years, and lets an engineer find every recorded instance of a described scenario, such as a cyclist crossing a junction at night, within an hour.',
    asks: [
      { ask: 'How many vehicles, how much does each record an hour, and how many hours a day do they drive?', changes: 'These set the daily volume, which decides whether the network can carry it at all.' },
      { ask: 'Do the vehicles return to a depot each night, and what links do the depots have?', changes: 'A depot with a fast link, or drives carried by van, is the cheap wide path; cellular is the narrow one.' },
      { ask: 'Which data is urgent, and how soon must it arrive?', changes: 'Faults and rare events may need minutes, over cellular; everything else can wait for the depot.' },
      { ask: 'How long must data be kept, and must faces and number plates be removed?', changes: 'Retention sets the storage bill and the tiers; privacy adds blurring and targeted deletion.' },
      { ask: 'What does "find every instance" mean: which queries, and how complete must the results be?', changes: 'Planned queries need a tag index; unplanned ones need embedding search; "every" needs a recall measurement.' },
    ],
    inputs: [
      { key: 'vehicles', label: 'Vehicles', steps: LOG(100, 100_000), value: 1000, show: (v) => n(v), color: 'request' },
      { key: 'tbHour', label: 'Recorded per vehicle-hour', steps: [0.1, 0.25, 0.5, 1, 2, 4], value: 1, show: (v) => `${v} TB`, color: 'data' },
      { key: 'hours', label: 'Hours driven a day', steps: RANGE(2, 20, 2), value: 8, show: (v) => `${v} h`, color: 'clock' },
      { key: 'kept', label: 'Kept after triage on the vehicle', steps: [0.01, 0.02, 0.04, 0.1, 0.25, 0.5, 1], value: 0.04, show: pct, color: 'busy' },
    ],
    estimate: (v) => {
      const recorded = v.vehicles * v.tbHour * v.hours;
      const kept = recorded * v.kept;
      const links = kept / LINK_TB_DAY;
      return [
        `Recorded: ${bytes(recorded)} a day; kept: ${bytes(kept)} a day.`,
        `Uploading what is kept needs about ${n(Math.max(1, links))} links of 10 Gb/s running all day.`,
        `A year of kept data: ${bytes(kept * 365)}, which is why older data moves to erasure-coded cold storage.`,
        `A catalogue row per minute of driving: ${n(v.vehicles * v.hours * 60 * 365)} rows a year.`,
      ];
    },
    covers: [
      'Triggers on the vehicle that keep windows around rare events, with a small random sample of all driving',
      'Two paths: cellular for small urgent payloads, the depot or shipped drives for bulk data',
      'Resumable uploads in content-addressed chunks, so a dropped link wastes one chunk and duplicates cost nothing',
      'Hot and cold storage tiers with a retention policy, and blurring before anyone browses the imagery',
      'A catalogue written at ingest, indexed by time, place, software version and tags',
      'An embedding index for scenes nobody tagged, with recall measured on a hand-labelled sample',
      'Saved queries frozen as versioned scenario sets for simulation, labelling and evaluation',
    ],
    followUps: [
      { ask: 'A depot loses its network link for a week. What happens to the vehicles that use it?', hint: 'Uploads are queued by priority, triggered events first, so a long outage leaves only routine samples waiting; past a point, drives go by van.' },
      { ask: 'A member of the public asks for every image of their house to be removed.', hint: 'The catalogue finds every segment by place across all tiers; deletion is logged, and derived datasets are found by lineage.' },
      { ask: 'The fleet grows to 100 times its size. What moves?', hint: 'Computation moves to the depots: detectors and blurring run there, and only tags and requested windows travel.' },
      { ask: 'Engineers say the search misses scenes they know exist. How do you find out how much it misses?', hint: 'Label a random sample of segments by hand and measure each kind of query against it.' },
    ],
    lessons: ['sensors', 'chunks', 'kafka', 'edge', 'bigtable', 'search', 'labels'],
  },

  {
    id: 'eval-gate',
    title: 'Deciding whether a new model ships',
    prompt: 'A team retrains a perception model every week. Design the pipeline that decides whether each new version is better than the current one and safe to release, and that shows the person who signs it off why.',
    asks: [
      { ask: 'Which situations must never get worse, such as pedestrians at night or cyclists in rain?', changes: 'These protected slices each need enough examples to be measured on their own.' },
      { ask: 'How large a change matters, overall and on each protected slice?', changes: 'The smallest change that matters sets how many examples each slice needs.' },
      { ask: 'Where do the right answers come from, and how good are they?', changes: 'Label quality caps what any evaluation can see, and evaluation labels must not come from a model under comparison.' },
      { ask: 'What happens after the offline checks: replay, simulation, shadow mode, a staged rollout?', changes: 'The gate is the first of several, and the cheap checks run first.' },
      { ask: 'Who decides, and what do they need to see?', changes: 'A named owner needs a stored report: slices with intervals, flips and the broken examples.' },
    ],
    inputs: [
      { key: 'share', label: 'Rarest protected slice, share of driving', steps: [0.001, 0.002, 0.005, 0.01, 0.02, 0.05, 0.1], value: 0.01, show: pct, color: 'request' },
      { key: 'set', label: 'Evaluation set, sampled like driving', steps: LOG(10_000, 1_000_000), value: 50_000, show: (v) => `${n(v)} frames`, color: 'data' },
      { key: 'detect', label: 'Smallest change that matters', steps: [0.005, 0.01, 0.02, 0.03, 0.05], value: 0.02, show: (v) => `${sig(v * 100, 2)} points`, color: 'error' },
      { key: 'disagree', label: 'Examples on which two versions disagree', steps: [0.01, 0.02, 0.04, 0.06, 0.1], value: 0.04, show: pct, color: 'busy' },
    ],
    estimate: (v) => {
      const have = v.share * v.set;
      const paired = (3.84 * v.disagree) / (v.detect * v.detect);
      const separate = (3.84 * 2 * 0.09) / (v.detect * v.detect);
      return [
        `The slice has about ${n(have)} examples in the set as sampled.`,
        `To measure a ${sig(v.detect * 100, 2)}-point change on it takes about ${n(paired)} examples compared paired, or ${n(separate)} scored separately.`,
        have >= paired ? 'Sampled like driving, the set already covers the slice.' : `Oversample the slice about ${times(paired / have)}, from many different drives, and reweight for the overall figure.`,
        'Counts here treat examples as independent; frames from one drive are not, so the interval comes from resampling whole drives.',
      ];
    },
    covers: [
      'A golden set and a broad held-out set, versioned and kept where training jobs cannot read them',
      'Held-out data split by place and time with a stable hash, so near-duplicate frames never cross the split',
      'Protected slices named in advance, oversampled, and each judged on its own',
      'Paired comparison with intervals from resampling whole drives, and negative flips counted per slice',
      'A noise floor from training the same model with several seeds',
      'A predictions table keyed by model, evaluation-set version and example, so any slice is a query',
      'Gates in order of cost: offline sets, on-target latency, replay, shadow mode, staged rollout',
      'A stored release report and a named owner who signs off',
    ],
    followUps: [
      { ask: 'The overall score rises by a point and one protected slice falls by three. The team wants to ship. What does the gate do?', hint: 'It blocks: a protected slice clearly worse than its margin blocks, whatever the average does.' },
      { ask: 'A new slice is requested for the last ten model versions. What does it cost?', hint: 'A query over the predictions table, if raw predictions were stored; otherwise ten re-runs.' },
      { ask: 'Scores on the evaluation set keep rising but the fleet does not seem better. What might be wrong?', hint: 'Leakage through near-duplicates or tuning against the golden set; check the split and who reads the set.' },
      { ask: 'Ten candidates a day instead of one a week.', hint: 'Cache predictions by version, run cheap sets first, and send only the best few to replay.' },
    ],
    lessons: ['evals', 'replay', 'labels', 'tail', 'rollout'],
  },

  {
    id: 'labelling',
    title: 'A labelling platform you can measure',
    prompt: 'Several teams need about a million labels a month: boxes around objects in camera frames and tags on short clips. Design the platform that produces them with a few hundred labellers and a model that suggests labels, and that can say, with evidence, how many labels are wrong.',
    asks: [
      { ask: 'What is being labelled, and how long does one item take?', changes: 'Minutes per item and the workforce set the attention each item can get.' },
      { ask: 'What error rate can each team accept, and how will anyone know the real rate?', changes: 'A measured rate needs a random audit; agreement alone measures only slips.' },
      { ask: 'Is there a model good enough to suggest labels, or to label alone?', changes: 'Suggestions are faster and anchor people; labels with no person need calibration checks.' },
      { ask: 'Which items are worth labelling next?', changes: 'Active learning spends the budget well and biases the sample, so a random stream is kept.' },
      { ask: 'Who sees the images, and what must be removed first?', changes: 'Faces and plates are blurred before the queue, without making training differ from serving.' },
    ],
    inputs: [
      { key: 'labels', label: 'Labels a month', steps: LOG(100_000, 10_000_000), value: 1_000_000, show: (v) => n(v), color: 'request' },
      { key: 'minutes', label: 'Minutes per label', steps: [0.25, 0.5, 1, 2, 3, 5], value: 1, show: (v) => `${v} min`, color: 'clock' },
      { key: 'overlap', label: 'Labellers per item', steps: [1, 2, 3], value: 2, show: (v) => String(v), color: 'busy' },
      { key: 'skip', label: 'Items the model labels alone', steps: [0, 0.1, 0.2, 0.3, 0.5, 0.7], value: 0, show: pct, color: 'model' },
    ],
    estimate: (v) => {
      const perDay = v.labels / 30;
      const people = perDay * (1 - v.skip);
      const minutes = people * v.minutes * v.overlap + perDay * 0.02 * 3;
      const labellers = minutes / (7 * 60);
      return [
        `About ${n(perDay)} labels a day, ${n(people)} of them seen by people.`,
        `People's time: about ${n(minutes)} minutes a day, including a 2% expert audit at 3 minutes an item.`,
        `That is about ${n(labellers)} labellers working seven-hour days.`,
        v.skip > 0 ? `${pct(v.skip)} of labels go straight to training unseen, so the model's confidence must be calibrated per class and slice, and checked for every version.` : 'Every label is seen by at least one person.',
      ];
    },
    covers: [
      'An append-only record of label events, with the guideline version and any suggestion shown; the current label is a view',
      'Versioned guidelines with owners, and unclear sections found from audit errors',
      'Overlap and adjudication for slips, gold questions for labellers, a random expert audit for the true rate',
      'Anchoring measured with deliberately wrong suggestions, and evaluation labels made from blank frames',
      'Calibration checked per class and slice before a model may label alone',
      'Active learning beside a random stream kept for audits and evaluation',
      'A task queue with qualifications, leases and quotas, and blurring before the queue',
    ],
    followUps: [
      { ask: 'Two labellers agree on 98% of items, and an audit finds 6% wrong. What is happening?', hint: 'Shared errors: an unclear guideline section, or a wrong suggestion both accepted. Audit errors by section.' },
      { ask: 'The guideline changes what counts as a cyclist. What happens to last month\'s labels?', hint: 'Add reclassification events and recompute the view; nothing is overwritten.' },
      { ask: 'The workforce grows to thousands across three vendors.', hint: 'Measure quality per vendor and site, watch drift in gold and audit results, and alert on it.' },
      { ask: 'A team wants its evaluation set built from the hardest items active learning chose.', hint: 'Those are deliberately unusual; evaluation needs the random stream.' },
    ],
    lessons: ['labels', 'evals', 'replay', 'sensors', 'slo'],
  },

  {
    id: 'dataset',
    title: 'One dataset that many teams build on',
    prompt: 'A world map is built every day from several sources (an open map, a licensed business directory, and a fleet\'s own observations) and read by routing, search, rendering and machine-learning teams. Design how it is built, versioned, published and corrected. Then grow its coverage a hundred times.',
    asks: [
      { ask: 'How many records, from how many sources, and how much changes each day?', changes: 'The change rate decides how much an incremental build saves over a full rebuild.' },
      { ask: 'What do consumers store: our IDs, copies, models trained on the data?', changes: 'Stored IDs must be stable; copies and models need lineage and deletion notices.' },
      { ask: 'How fresh must each consumer be, and can each move to a new version on its own schedule?', changes: 'Pinned versions, deltas between them, and how long old versions are kept.' },
      { ask: 'Which licences apply, and what must be removed on request?', changes: 'Per-attribute sources, and a suppression list every build reads.' },
    ],
    inputs: [
      { key: 'records', label: 'Records', steps: LOG(10_000_000, 10_000_000_000), value: 500_000_000, show: (v) => n(v), color: 'data' },
      { key: 'change', label: 'Records changed a day', steps: [0.001, 0.002, 0.005, 0.01, 0.02, 0.05, 0.1], value: 0.005, show: pct, color: 'write' },
      { key: 'kept', label: 'Daily versions kept', steps: [7, 14, 30, 60, 90, 180, 365], value: 90, show: (v) => `${v} days`, color: 'clock' },
      { key: 'regions', label: 'Regions, one rebuilt a day', steps: [1, 2, 4, 8, 16, 32, 64], value: 8, show: (v) => String(v), color: 'busy' },
    ],
    estimate: (v) => {
      const tb = (v.records * 500) / 1e12;
      const delta = tb * v.change;
      return [
        `One version, at about 500 bytes a record: ${bytes(tb)}. A day's delta: ${bytes(delta)}.`,
        `${v.kept} daily versions sharing unchanged files: about ${bytes(tb + delta * v.kept)}, not ${bytes(tb * v.kept)}.`,
        `An incremental build touches about ${pct(v.change)} of the records; a full rebuild touches all of them, about ${times(1 / v.change)} the work.`,
        `With one region rebuilt and compared each day, no region goes more than ${v.regions} days without a full check.`,
      ];
    },
    covers: [
      'Conflation with an ID registry: stable IDs, never reused, with merges and splits recorded',
      'Immutable versions as manifests of content-addressed files, published by an atomic pointer move',
      'Pinned versions, deltas that name their start and end versions, and a fixed retention period',
      'Lineage per table or file, plus per-attribute sources in each record',
      'Schema changes by adding fields; backfills that write new versions of whole partitions',
      'Deletion through a suppression list that every build reads, and logged rewrites of retained versions',
      'Incremental daily builds checked by a deterministic rolling rebuild from the same pinned inputs',
      'Write-audit-publish checks before the pointer moves',
    ],
    followUps: [
      { ask: 'Today\'s version has wrong speed limits, and routing has already built on yesterday\'s.', hint: 'Move the pointer back; publish the fix as a new version; routing stays pinned until its tests pass.' },
      { ask: 'Coverage grows a hundred times. What breaks first?', hint: 'Conflation: block candidates by map cell and its neighbours, partition the build by region, shard the registry.' },
      { ask: 'A business removed on request reappears in next week\'s build.', hint: 'The licensed source still holds it; the suppression list must be read by both the incremental build and the rebuild.' },
      { ask: 'The rolling rebuild and the incremental build agree, yet a consumer finds wrong data.', hint: 'Both share the matching code; bugs there need checks and audits against the real world.' },
    ],
    lessons: ['datasets', 'validation', 'mapreduce', 'chubby', 'streams', 'tiles'],
  },

  {
    id: 'map-changes',
    title: 'Keeping a map in step with the world',
    prompt: 'Roads close, turns are banned, shops move and places are renamed. Vehicles, phones, users\' reports and outside sources all notice. Design the system that turns these observations into map changes, decides which need a person, publishes them quickly and safely, and can take them back.',
    asks: [
      { ask: 'How many proposed changes a day, of which kinds, and from which sources?', changes: 'The mix sets the review load and which sources need trust scores.' },
      { ask: 'How fast must each kind of change reach users?', changes: 'A closure for a fire needs minutes; a moved shop can wait days.' },
      { ask: 'What does a wrong change cost, and to how many people?', changes: 'Risk tiers come from the kind of change and the prominence of the place.' },
      { ask: 'How many reviewers are there, and how many changes can each clear?', changes: 'The automatic threshold and the reviewer count must be set together.' },
    ],
    inputs: [
      { key: 'changes', label: 'Proposed changes a day', steps: LOG(1_000, 1_000_000), value: 10_000, show: (v) => n(v), color: 'request' },
      { key: 'auto', label: 'Published without a person', steps: [0, 0.2, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9], value: 0.5, show: pct, color: 'answer' },
      { key: 'high', label: 'High-risk share, two reviewers each', steps: [0.005, 0.01, 0.02, 0.05, 0.1], value: 0.02, show: pct, color: 'error' },
      { key: 'rate', label: 'Changes a reviewer clears a day', steps: [100, 200, 300, 400, 600, 800], value: 400, show: (v) => n(v), color: 'busy' },
    ],
    estimate: (v) => {
      const reviews = v.changes * (1 - v.auto - v.high) + v.changes * v.high * 2;
      const people = reviews / v.rate;
      return [
        `About ${n(Math.max(0, reviews))} reviews a day, counting two for each high-risk change.`,
        `That needs about ${n(Math.max(0, people))} reviewers to keep the queue from growing.`,
        'With fewer, the queue grows every day; a change waits about the queue length divided by the review rate.',
        'Raising the automatic threshold makes each automatic change safer and sends more work to people.',
      ];
    },
    covers: [
      'Observations grouped by source, so only independent evidence adds confidence',
      'A calibrated confidence score, checked on a sample people verify',
      'Risk tiers from kind and prominence, with two independent reviewers at the top',
      'A review queue ordered by risk and urgency, with capacity planned against the automatic threshold',
      'Changes applied through the dataset pipeline and its whole-map checks before publishing',
      'A live overlay for urgent closures, with expiry for unconfirmed ones',
      'Rollback by change or by source, reviewed like any other change',
      'Outcome tracking that adjusts each tier\'s thresholds',
    ],
    followUps: [
      { ask: 'One reviewer approves an offensive name for a capital city.', hint: 'Prominent names need two independent reviewers; the publish checks are a further layer.' },
      { ask: 'An account is found to have made false reports for a month.', hint: 'Provenance lists every change it contributed to; revert them as a reviewed batch.' },
      { ask: 'Proposed changes grow a hundred times, mostly from vehicles and phones.', hint: 'A streaming system: match observations to features as they arrive, score continuously, review samples.' },
    ],
    lessons: ['changes', 'traffic', 'labels', 'validation', 'datasets', 'slashdot'],
  },

  {
    id: 'fleet-release',
    title: 'Shipping data and configuration to a fleet',
    prompt: 'A maker sends software, map editions, models and configuration files to a fleet of cars. A bad release may crash cars, or may simply be wrong. Design the release system: stages, health checks that see both kinds of failure, automatic stop and rollback, and versions that stay compatible.',
    asks: [
      { ask: 'What ships, how large is each kind of artifact, and how often?', changes: 'Size and frequency decide deltas, Wi-Fi preference and server capacity.' },
      { ask: 'How do cars report health, and how often are they on?', changes: 'Parked cars report late, so stages last days and missing heartbeats count as failures.' },
      { ask: 'What does a release that is wrong rather than broken look like, and what would show it?', changes: 'Accuracy measures need a control group and a stop rule written in advance.' },
      { ask: 'Which software versions can read which data versions?', changes: 'The server must never offer data a car cannot read.' },
    ],
    inputs: [
      { key: 'fleet', label: 'Cars', steps: LOG(10_000, 10_000_000), value: 2_000_000, show: (v) => n(v), color: 'request' },
      { key: 'stage', label: 'First stage', steps: [0.001, 0.005, 0.01, 0.02, 0.05, 0.1], value: 0.01, show: pct, color: 'busy' },
      { key: 'base', label: 'Map errors reported per 10,000 trips', steps: [0.5, 1, 2, 5, 10], value: 2, show: (v) => String(v), color: 'error' },
      { key: 'rise', label: 'Rise that should halt the release', steps: [0.25, 0.5, 1, 2, 5], value: 1, show: (v) => `+${v}`, color: 'error' },
    ],
    estimate: (v) => {
      const b = v.base / 1e4;
      const d = v.rise / 1e4;
      const trips = (4 * (2 * b + d)) / (d * d);
      const cars = v.fleet * v.stage;
      const days = trips / (cars * 2);
      return [
        `The first stage is ${n(cars)} cars.`,
        `Telling a rise of ${v.rise} in 10,000 from chance takes about ${n(trips)} trips in the stage, and as many in the control group.`,
        `At two trips a car a day, the stage must run at least ${days < 1 ? 'one day' : `${n(Math.ceil(days))} days`} before the gate may pass it.`,
        'A crash or a failed load shows within hours; a wrong map shows only through measures like this one.',
      ];
    },
    covers: [
      'Stages with a health gate against a matched control group, halting automatically',
      'Heartbeats, with missing ones counted as failures',
      'Accuracy measures for data and models, with stop rules and minimum samples set in advance',
      'Shadow mode for models before they control anything',
      'A/B slots and a bootloader that falls back, so no car needs a workshop',
      'Signed metadata with split roles, so one stolen key installs nothing',
      'Deltas from recent versions, Wi-Fi first, and full images for cars far behind',
      'Compatibility ranges between software and data, checked by the server before it offers anything',
    ],
    followUps: [
      { ask: 'A configuration file crashes every machine that loads it, within minutes.', hint: 'Configuration goes through the same stages as code, with the loader validating input before use.' },
      { ask: 'A car parked for five months comes back.', hint: 'A chain of deltas if they exist, else the full image; the server picks the cheapest verified path.' },
      { ask: 'A new map format cannot be read by last month\'s software.', hint: 'Expand and contract: build both formats until nearly every car can read the new one.' },
      { ask: 'Ten times the fleet, with far more hardware models.', hint: 'Which image for which car becomes a table built and tested automatically.' },
    ],
    lessons: ['rollout', 'outage', 'slo', 'evals', 'replay', 'tiles'],
  },

  {
    id: 'simulation',
    title: 'Millions of simulated scenarios a night',
    prompt: 'Every software change for a fleet must be tested against a large library of recorded and simulated scenarios before morning. Design the platform that runs them on shared computing capacity within a budget, and turns millions of results into a short list a person can act on.',
    asks: [
      { ask: 'How many scenarios, how long is each, and how fast does the simulator run?', changes: 'Core-hours a night, and whether spare capacity covers them.' },
      { ask: 'When must results arrive, and what does a night cost?', changes: 'Preemptible capacity is cheaper and interrupts tasks, which sets task length and checkpoints.' },
      { ask: 'Which software is tested: perception only, or the parts that drive?', changes: 'Log replay cannot react to a changed driver, so driving needs closed-loop simulation.' },
      { ask: 'What counts as a regression, and who reads the report?', changes: 'Per-slice statistics, multiple-comparison control and invariants that must always hold.' },
    ],
    inputs: [
      { key: 'scenarios', label: 'Scenarios a night', steps: LOG(10_000, 100_000_000), value: 1_000_000, show: (v) => n(v), color: 'request' },
      { key: 'seconds', label: 'Length of each', steps: [10, 20, 30, 60, 120], value: 30, show: (v) => `${v} s`, color: 'clock' },
      { key: 'cost', label: 'Core-seconds per simulated second', steps: [0.5, 1, 2, 4, 8], value: 4, show: (v) => String(v), color: 'busy' },
      { key: 'price', label: 'Price per core-hour', steps: [0.005, 0.01, 0.02, 0.04, 0.08], value: 0.01, show: (v) => `$${v}`, color: 'cost' },
    ],
    estimate: (v) => {
      const coreHours = (2 * v.scenarios * v.seconds * v.cost) / 3600;
      return [
        `New build and baseline together: about ${n(coreHours)} core-hours a night.`,
        `In eight hours that needs about ${n(coreHours / 8)} cores, and costs about ${money(coreHours * v.price)} a night.`,
        `Reusing the baseline's stored results halves it, to about ${n(coreHours / 2)} core-hours.`,
        `A comparison that flags 1% by chance would flag ${n(v.scenarios * 0.01)} scenarios; report by group, with a corrected threshold.`,
      ];
    },
    covers: [
      'A deterministic simulator: simulated clock, seeded randomness, fixed ordering, pinned builds',
      'A job store replicated by consensus, an elected scheduler holding no state, and workers that pull tasks under leases',
      'Idempotent tasks with outputs keyed by the hash of their inputs, and retry limits',
      'Preemptible capacity with tasks sized against preemption, or checkpoints',
      'Caching the baseline\'s results by input hash',
      'Closed-loop simulation where the new build diverges from the log',
      'Results grouped by scenario tags with intervals and a corrected threshold, plus invariants',
      'Flaky scenarios quarantined openly, and scenario sets frozen as versions',
    ],
    followUps: [
      { ask: 'The scheduler\'s machine dies at 03:00.', hint: 'A standby takes the lock with a new epoch; workers carry on against the job store.' },
      { ask: 'The report flags 10,000 changes a night and engineers ignore it.', hint: 'Group by tag, compute intervals, control for many comparisons, and keep hard invariants separate.' },
      { ask: 'Ten times the scenarios, beyond one cluster\'s spare capacity.', hint: 'Spread across cells, run stratified samples nightly and the full library weekly, and screen with a cheaper simulator first.' },
    ],
    lessons: ['replay', 'mapreduce', 'chubby', 'sensors', 'evals', 'tail'],
  },

  {
    id: 'telemetry',
    title: 'Telemetry from every vehicle',
    prompt: 'A fleet sends metrics and events from every vehicle. Design the system that collects them over unreliable links, alerts on rare faults without paging people for noise, gives operators dashboards by model and region, and keeps the data for the right length of time at a sensible cost.',
    asks: [
      { ask: 'How many vehicles, how many metrics each, and how often?', changes: 'Points a second and series count, which decide the store.' },
      { ask: 'Which breakdowns do operators need: by vehicle, model, software version, region?', changes: 'Each label multiplies the series; per-vehicle detail belongs in logs or on-demand pulls.' },
      { ask: 'What must page someone, and how rare can a fault be and still matter?', changes: 'Alerts on symptoms and burn rate, with cohorts compared against control groups.' },
      { ask: 'How long must raw and summarised data be kept?', changes: 'Retention tiers with downsampling, and what can be recomputed.' },
    ],
    inputs: [
      { key: 'vehicles', label: 'Vehicles', steps: LOG(10_000, 10_000_000), value: 1_000_000, show: (v) => n(v), color: 'request' },
      { key: 'metrics', label: 'Metrics per vehicle', steps: [10, 50, 100, 200, 500, 1000], value: 200, show: (v) => n(v), color: 'data' },
      { key: 'interval', label: 'One sample every', steps: [1, 10, 60, 300, 900], value: 60, show: (v) => (v >= 60 ? `${v / 60} min` : `${v} s`), color: 'clock' },
      { key: 'online', label: 'Share of vehicles online', steps: [0.1, 0.25, 0.5, 0.75, 1], value: 0.25, show: pct, color: 'busy' },
    ],
    estimate: (v) => {
      const pps = (v.vehicles * v.online * v.metrics) / v.interval;
      const dayTb = (pps * 86_400 * 1.4) / 1e12;
      return [
        `About ${n(pps)} points a second when ${pct(v.online)} of vehicles are online.`,
        `At about 1.4 bytes a point after compression: ${bytes(dayTb)} a day, ${bytes(dayTb * 365)} a year at full resolution.`,
        `Kept per vehicle, that is ${n(v.vehicles * v.metrics)} series; aggregated by model, software and region it is a few thousand per metric.`,
        'Per-vehicle detail goes to logs and on-demand pulls; dashboards and alerts read the aggregates.',
      ];
    },
    covers: [
      'Counters kept on the vehicle and sent as cumulative totals, so a week offline loses nothing',
      'Both the vehicle\'s timestamp and the server\'s, with event time used for windows',
      'Aggregation by cohort (model, software, map edition, region), with cardinality kept bounded',
      'Alerts on symptoms and burn rate, comparing each cohort with a control group',
      'Missing heartbeats counted as failures',
      'Retention tiers: recent data at full resolution, older data downsampled',
      'On-demand diagnostic pulls from single vehicles instead of uploading every log',
      'A monitoring system that shares as little as possible with what it monitors',
    ],
    followUps: [
      { ask: 'A fault affects one vehicle in a hundred thousand.', hint: 'Too rare for one cohort; aggregate across cohorts and time, and route support reports into the same view.' },
      { ask: 'An operator wants per-vehicle charts for the whole fleet.', hint: 'That is millions of series; give per-vehicle drill-down from logs or on-demand pulls instead.' },
      { ask: 'A region loses mobile coverage for an evening.', hint: 'Compare with control groups in the same region; cumulative counters fill the gap when vehicles reconnect.' },
    ],
    lessons: ['slo', 'streams', 'kafka', 'rollout', 'sensors', 'edge'],
  },
];
