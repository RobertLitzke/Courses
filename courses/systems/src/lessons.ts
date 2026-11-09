// Every lesson, written or to come, and the branches of the lesson tree.
// Written lessons are JSON in src/lessons/; the rest are listed here as
// "coming", so the home page shows the whole plan.

import type { Lesson } from 'didactics/lesson';
import { lessonCodes, type TreeBranch, type TreeLesson } from 'didactics/tree';

export type SystemsLesson = Lesson & TreeLesson;

const written = import.meta.glob<SystemsLesson>('./lessons/*.json', { eager: true, import: 'default' });

/** A lesson not written yet: its place in the tree and what it will answer. */
export const coming = (id: string, n: number, title: string, teaches: string, more: Partial<SystemsLesson> = {}): SystemsLesson =>
  ({ id, n, title, teaches, parts: [], coming: true, summary: [], ...more });

const COMING: SystemsLesson[] = [
  coming('nanosecond', 1, 'How long is a nanosecond?', 'The costs every design rests on (memory, disk, network, a trip across an ocean) and estimating in round numbers'),
  coming('slashdot', 2, 'The link that took a website down', 'What happens between a click and the reply, why waiting time explodes as a server nears full load, and Little\'s law'),
  coming('tinyurl', 3, 'A shorter link, a billion times', 'How a design is worked out on paper: what it must do, the numbers, the API and the data, then the boxes; and handing out short unique keys'),
  coming('replicas', 4, 'When the database can\'t keep up', 'Read replicas and replication lag, reading your own writes, and splitting users across databases'),
  coming('memcached', 5, 'A cache in spare memory', 'Caching in front of a database, hit-rate arithmetic, invalidation, and consistent hashing'),
  coming('gfs', 6, 'One master, a thousand disks', 'Splitting metadata from data, big blocks, and why one coordinator can be the right first design'),
  coming('chunks', 7, 'A disk dies every day', 'Replication and re-replication, leases that pick a primary, checksums, at-least-once appends, and erasure coding'),
  coming('mapreduce', 8, 'Rebuilding the index on machines that fail', 'Map, shuffle and reduce; moving the work to the data; re-running lost work; backup copies of slow tasks'),
  coming('tail', 9, 'Why the slowest machine sets the pace', 'Percentiles, how fanning out to many servers turns rare delays into common ones, and hedged requests'),
  coming('bigtable', 10, 'A sorted map for the whole web', 'Log-structured storage (memtable, SSTables, compaction, Bloom filters), splitting by key range, and choosing a row key'),
  coming('chubby', 11, 'Who is in charge?', 'Agreement by majority (Paxos and Raft), leader leases, fencing tokens, and keeping the agreeing part small'),
  coming('dynamo', 12, 'A shopping cart that never says no', 'Consistent hashing with virtual nodes, replicas along the ring, quorums (N, R, W), hinted handoff, and Merkle-tree repair'),
  coming('conflicts', 13, 'The item that came back', 'Versions and vector clocks, merging conflicting writes, CRDTs and collaborative editing, consistency models, and CAP and PACELC'),
  coming('fanout', 14, 'Who pays for a tweet?', 'Fan-out on write and on read, the hybrid for accounts with millions of followers, and IDs that sort by time'),
  coming('leases', 15, 'When every cache misses at once', 'Thundering herds and stale sets, leases, invalidation from the database\'s log, and caches across regions'),
  coming('kafka', 16, 'The log at the centre', 'Append-only partitioned logs, offsets and consumer groups, ordering by key, retention and replay, and why sequential disk is fast'),
  coming('streams', 17, 'Counting clicks that arrive late', 'Event time and processing time, windows and watermarks, exactly-once effects by deduplication, and sketches for heavy hitters'),
  coming('chaos', 18, 'Breaking things on purpose', 'Timeouts, retries with backoff and jitter, retry storms, circuit breakers, bulkheads, load shedding, and Chaos Monkey'),
  coming('edge', 19, 'A third of the evening\'s internet', 'Content delivery networks, caching at the edge, adaptive bitrate video, filling caches off-peak, and the cost of moving bytes'),
  coming('spanner', 20, 'A clock you can trust', 'Why wall clocks lie, two-phase commit and why it blocks, TrueTime\'s bounded uncertainty, and commit wait'),
  coming('zanzibar', 21, 'Who may see this file?', 'Permissions as relation tuples, the "new enemy" problem and consistency tokens, and answering ten million checks a second'),
  coming('payments', 22, 'Charging a card exactly once', 'The two generals problem, idempotency keys, a double-entry ledger, the outbox, and reconciliation'),
  coming('outage', 23, 'One command, four hours', 'Blast radius, cells and shuffle sharding, static stability, safe changes, and dependency loops'),
  coming('slo', 24, 'The website nobody could see inside', 'What "working" means (SLIs, SLOs, error budgets), the four golden signals, alerting on symptoms, and storing metrics'),
  coming('tiles', 101, 'A map of the world in squares', 'Tile pyramids, how many tiles each zoom needs, pre-rendering against rendering on demand, vector tiles, and versioned map updates', { branch: 'maps', needs: ['edge'] }),
  coming('nearby', 102, 'Finding the nearest car', 'Cells and space-filling curves (geohash, quadtrees, S2, H3), a stream of location updates held in memory, and sharding by cell', { branch: 'maps', needs: ['tiles', 'bigtable', 'dynamo'] }),
  coming('routing', 103, 'Across a continent in a millisecond', 'Dijkstra and A*, contraction hierarchies, and customisable route planning: precompute the structure, re-weight the roads fast', { branch: 'maps', needs: ['nearby', 'mapreduce'] }),
  coming('traffic', 104, 'Ninety-nine phones in a handcart', 'Turning phones\' positions into road speeds, map matching, windows, privacy and spoofing, and predicting arrival times', { branch: 'maps', needs: ['routing', 'streams'] }),
  coming('limiter', 201, 'Saying no politely', 'Rate limits and load shedding: token buckets, sliding windows, shared counters, and where the limiter sits', { branch: 'studio', needs: ['memcached', 'chaos'] }),
  coming('chat', 202, 'Half a billion people, a few dozen engineers', 'A chat service: long-lived connections, delivery and read receipts, ordering in a conversation, message storage, presence and push', { branch: 'studio', needs: ['kafka', 'fanout', 'conflicts'] }),
  coming('search', 203, 'From crawl to suggestion', 'A web crawler (frontier, politeness, duplicates), an inverted index, and suggestions as you type', { branch: 'studio', needs: ['mapreduce', 'tail', 'bigtable'] }),
  coming('tickets', 204, 'Fourteen million people, two million tickets', 'Selling something scarce: a waiting room, holds that expire, no seat sold twice, and bots', { branch: 'studio', needs: ['limiter', 'payments', 'spanner'] }),
  coming('sensors', 205, 'More data than the network can carry', 'Pipelines for instruments and fleets: filter at the source, upload or ship the disks, resumable chunked uploads, tiered storage, and a catalogue', { branch: 'studio', needs: ['chunks', 'kafka', 'edge'] }),
  coming('replay', 206, 'Every night, all of history again', 'Deterministic replay, a million jobs on a cluster scheduler (Borg), preemptible capacity, and comparing results', { branch: 'studio', needs: ['mapreduce', 'chubby'] }),
  coming('rollout', 207, 'One update, 8.5 million screens', 'Shipping software and data to a fleet: staged rollouts, canaries and automatic rollback, A/B partitions, signed updates, offline devices, fleet health', { branch: 'studio', needs: ['outage', 'slo'] }),
];

/** The branches: maps and places, and the design studio. */
export const BRANCHES: TreeBranch[] = [
  { id: 'maps', title: 'Maps and places', promise: 'Map tiles, the nearest car, routes across a continent and traffic from phones', from: 'edge', color: 'var(--teal)', prefix: 'M' },
  { id: 'studio', title: 'Design studio', promise: 'Whole designs from a blank page, then how a real team did it', from: 'chaos', color: 'var(--sun)', prefix: 'D' },
];

/** How many lessons the trunk has: "Lesson 3 of 24". */
export const TRUNK = 24;

const done = Object.values(written);
const ids = new Set(done.map((l) => l.id));
const all = [...done, ...COMING.filter((l) => !ids.has(l.id))].sort((a, b) => a.n - b.n);
const codes = lessonCodes(all, BRANCHES);

/** Every lesson in tree order, each with its code ("3", "D2"). */
export const LESSONS: readonly SystemsLesson[] = all.map((l) => ({ ...l, code: l.branch ? codes.get(l.id) : undefined }));

/** The lessons that are written. */
export const WRITTEN: readonly SystemsLesson[] = LESSONS.filter((l) => !l.coming);
