// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { FIGURES } from '../src/figures';
import { clicks, CountMin, dedupScript, NOW_MAX, PAGES, sketchReport, VIEWS, windows, zipfCounts } from '../src/figures/streams';
import { click, context, setSlider } from './helpers';

describe('streams: windows and watermarks', () => {
  const cs = clicks();

  it('has a few late clicks, none later than four minutes', () => {
    const late = cs.filter((c) => c.arrive - c.event > 60);
    expect(late.length).toBeGreaterThanOrEqual(3);
    expect(Math.max(...cs.map((c) => c.arrive - c.event))).toBeLessThan(240);
    expect(Math.max(...cs.map((c) => c.arrive))).toBeLessThan(NOW_MAX);
  });

  it('a short watermark dropping late clicks leaves four minutes short, as the lesson says', () => {
    const r = windows(cs, NOW_MAX, 20, false);
    expect(r.filter((w) => w.now < w.truth).length).toBe(4);
    expect(r.every((w) => w.firstAt === w.start + 80)).toBe(true);
  });

  it('a four-minute wait or revisions end exact', () => {
    expect(windows(cs, NOW_MAX, 240, false).every((w) => w.first === w.truth)).toBe(true);
    const rev = windows(cs, NOW_MAX, 20, true);
    expect(rev.every((w) => w.now === w.truth)).toBe(true);
    expect(rev.some((w) => w.first < w.truth)).toBe(true);
  });

  it('no window answers before the watermark passes its end', () => {
    const r = windows(cs, 70, 20, true);
    expect(r[0].firstAt).toBeNull();
    expect(windows(cs, 80, 20, true)[0].firstAt).toBe(80);
  });

  it('the figure is done when revising and played to the end', async () => {
    let done = false;
    const h = FIGURES['streams-window'](context(), 'complete');
    h.done!.then(() => (done = true));
    setSlider(h.node, 0, NOW_MAX);
    await Promise.resolve();
    expect(done).toBe(false);
    click(h.node, 'Late clicks: revise the count');
    setSlider(h.node, 0, NOW_MAX - 5);
    setSlider(h.node, 0, NOW_MAX);
    await Promise.resolve();
    expect(done).toBe(true);
  });
});

describe('streams: deduplication', () => {
  it('counts twice without the registry, once with it', () => {
    const adds = (r: boolean) => dedupScript(r).messages.filter((m) => m.to === 'n').length;
    expect(adds(false)).toBe(2);
    expect(adds(true)).toBe(1);
  });

  it('the figure is done with the registry, played through', async () => {
    let done = false;
    const h = FIGURES['streams-dedup'](context(), 'once');
    h.done!.then(() => (done = true));
    click(h.node, 'ID registry');
    setSlider(h.node, 0, 95);
    await Promise.resolve();
    expect(done).toBe(true);
  });
});

describe('streams: the count-min sketch', () => {
  it('never underestimates', () => {
    const counts = zipfCounts(2000, 20000, 1.1, 3);
    const cm = new CountMin(64, 3);
    counts.forEach((n, k) => n && cm.add(k, n));
    for (let k = 0; k < 2000; k++) expect(cm.estimate(k)).toBeGreaterThanOrEqual(counts[k]);
  });

  it('a narrow sketch misnames the top ten; one of 4 × 512 names them all', () => {
    const counts = zipfCounts(PAGES, VIEWS, 1.1, 5);
    expect(counts.reduce((a, b) => a + b, 0)).toBe(VIEWS);
    expect(sketchReport(counts, 64, 2).topRight).toBeLessThan(10);
    const good = sketchReport(counts, 512, 4);
    expect(good.counters).toBeLessThanOrEqual(2500);
    expect(good.topRight).toBe(10);
  });

  it('the figure is done with a small sketch that is right', async () => {
    let done = false;
    const h = FIGURES['streams-sketch'](context(), 'top10');
    h.done!.then(() => (done = true));
    // Width runs on a log slider from 16 to 2048 over 1000 positions: 512 is at 1000 × ln(32)/ln(128).
    setSlider(h.node, 0, Math.round((1000 * Math.log(32)) / Math.log(128)));
    setSlider(h.node, 1, 4);
    await Promise.resolve();
    expect(done).toBe(true);
  });
});
