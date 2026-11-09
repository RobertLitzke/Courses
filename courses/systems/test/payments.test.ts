// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { FIGURES } from '../src/figures';
import { balances, LEDGER, retryRun, RETRY_END, txnSums, writeRun } from '../src/figures/payments';
import { click, context, setSlider } from './helpers';

describe('payments: the retry', () => {
  it('a lost reply and a blind retry charge twice', () => {
    expect(retryRun('reply', false).charges).toBe(2);
  });
  it('a key makes the retry charge once', () => {
    expect(retryRun('reply', true).charges).toBe(1);
    expect(retryRun('request', true).charges).toBe(1);
    expect(retryRun('request', false).charges).toBe(1);
    expect(retryRun('nothing', false).charges).toBe(1);
  });
  it('every message arrives within the timeline', () => {
    for (const lost of ['nothing', 'request', 'reply'] as const) {
      for (const m of retryRun(lost, true).messages) expect(m.arrive).toBeLessThanOrEqual(RETRY_END);
    }
  });
});

describe('payments: the ledger', () => {
  it('every transaction sums to zero', () => {
    for (const v of txnSums(LEDGER).values()) expect(v).toBe(0);
  });
  it('the balances sum to zero and the fee is what is left at the bank', () => {
    const b = balances(LEDGER);
    expect([...b.values()].reduce((s, v) => s + v, 0)).toBe(0);
    expect(b.get('cash at bank')).toBe(146);
    expect(b.get('owed to merchant')).toBe(0);
  });
});

describe('payments: the outbox', () => {
  it('dual writes lose about the crash rate of events', () => {
    const r = writeRun('dual', 0.2, 2000);
    expect(r.missing / r.orders).toBeGreaterThan(0.15);
    expect(r.missing / r.orders).toBeLessThan(0.25);
    expect(r.repeats).toBe(0);
  });
  it('the outbox loses none but sometimes repeats', () => {
    const r = writeRun('outbox', 0.2, 2000);
    expect(r.missing).toBe(0);
    expect(r.events).toBe(r.orders);
    expect(r.repeats).toBeGreaterThan(0);
  });
});

describe('payments: the figures', () => {
  it('the retry figure is done with a lost reply, a key, and the end reached', async () => {
    let done = false;
    const h = FIGURES['payments-retry'](context(), 'once');
    h.done!.then(() => (done = true));
    click(h.node, 'Idempotency key');
    setSlider(h.node, 0, 500);
    await Promise.resolve();
    expect(done).toBe(false);
    setSlider(h.node, 0, RETRY_END);
    await Promise.resolve();
    expect(done).toBe(true);
  });
  it('the outbox figure is done once the outbox runs with crashes', async () => {
    let done = false;
    const h = FIGURES['payments-outbox'](context(), 'outbox');
    h.done!.then(() => (done = true));
    click(h.node, 'Outbox');
    await Promise.resolve();
    expect(done).toBe(true);
  });
  it('the stills draw', () => {
    expect(FIGURES['payments-keys'](context()).node.querySelector('svg')).toBeTruthy();
    expect(FIGURES['payments-ledger'](context()).node.querySelector('svg')).toBeTruthy();
  });
});
