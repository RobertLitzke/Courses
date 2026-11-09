// Numbers for estimates: rough costs of what a computer does, and plain ways
// to write sizes, rates and times. Round figures for the 2020s, good to a
// factor of a few; what matters is the ratios.

/** Rough time for each operation, in nanoseconds. */
export const COSTS = {
  'L1 cache reference': 1,
  'Branch mispredict': 3,
  'L2 cache reference': 4,
  'Mutex lock and unlock': 17,
  'Main memory reference': 100,
  'Compress 1 KB (fast codec)': 2_000,
  'Read 1 MB from memory': 3_000,
  'Send 1 KB over 10 Gb/s': 1_000,
  'Read 4 KB at random from SSD': 20_000,
  'Read 1 MB from SSD': 50_000,
  'Round trip in a datacentre': 500_000,
  'Read 1 MB from disk': 1_000_000,
  'Disk seek': 5_000_000,
  'Round trip, US west to east coast': 70_000_000,
  'Round trip, California to Europe': 150_000_000,
} as const;

export type Cost = keyof typeof COSTS;

const UNITS_B = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB'];

/** A size in bytes, in powers of 1000: 1.5 TB. */
export function bytes(n: number, digits = 2): string {
  let i = 0;
  let v = n;
  while (Math.abs(v) >= 1000 && i < UNITS_B.length - 1) {
    v /= 1000;
    i++;
  }
  return `${round(v, digits)} ${UNITS_B[i]}`;
}

/** A time in milliseconds, in the unit that reads best: 350 µs, 12 ms, 1.2 s, 3 min. */
export function duration(ms: number, digits = 2): string {
  if (!Number.isFinite(ms)) return '∞';
  const a = Math.abs(ms);
  if (a < 1e-3) return `${round(ms * 1e6, digits)} ns`;
  if (a < 1) return `${round(ms * 1e3, digits)} µs`;
  if (a < 1000) return `${round(ms, digits)} ms`;
  if (a < 60_000) return `${round(ms / 1000, digits)} s`;
  if (a < 3_600_000) return `${round(ms / 60_000, digits)} min`;
  if (a < 86_400_000) return `${round(ms / 3_600_000, digits)} h`;
  return `${round(ms / 86_400_000, digits)} days`;
}

/** A count with a word for its size: 12,000, 3.4 million, 2 billion. */
export function count(n: number, digits = 2): string {
  const a = Math.abs(n);
  if (a >= 1e12) return `${round(n / 1e12, digits)} trillion`;
  if (a >= 1e9) return `${round(n / 1e9, digits)} billion`;
  if (a >= 1e6) return `${round(n / 1e6, digits)} million`;
  return Math.round(n).toLocaleString('en-US');
}

/** A rate a second: 1,200 a second, 3.5 million a second. */
export const rate = (perSec: number, digits = 2) => `${count(perSec, digits)} a second`;

/** Seconds in a day, for turning a daily count into a rate. */
export const DAY = 86_400;

/** `n` to `d` significant figures, without trailing zeros. */
export function round(n: number, d = 2): string {
  if (n === 0) return '0';
  return Number(n.toPrecision(d)).toLocaleString('en-US', { maximumFractionDigits: 6 });
}
