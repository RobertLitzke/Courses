// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { FIGURES } from '../src/figures';
import { chatLoad, chatSize, chatTimeline, CHAT_CASES } from '../src/figures/chat';
import { click, context, guess, setSlider } from './helpers';

describe('chat: the estimate', () => {
  it('500 million people at 50 messages a day is about 290,000 a second', () => {
    const s = chatSize(500e6, 50, 2, 0.3, 2e6, 100);
    expect(s.perDay).toBe(25e9);
    expect(s.mean).toBeGreaterThan(280_000);
    expect(s.mean).toBeLessThan(300_000);
    expect(s.online).toBe(150e6);
    expect(s.gateways).toBe(75);
    expect(s.yearBytes / 1e15).toBeCloseTo(0.91, 1);
  });
});

describe('chat: one message', () => {
  it('every case ends with Bob showing the message once and Alice seeing it delivered', () => {
    for (const c of CHAT_CASES) {
      const tl = chatTimeline(c);
      expect(tl.shown).toBe(1);
      expect(tl.ticks).toBeGreaterThanOrEqual(2);
      expect(Math.max(...tl.messages.map((m) => m.arrive))).toBeLessThanOrEqual(tl.tMax);
      // Bob receives exactly one copy of message 42.
      expect(tl.messages.filter((m) => m.to === 'bob' && m.label === '42').length).toBe(1);
    }
  });

  it('a lost ack makes Alice send again, and the service keeps one number', () => {
    const tl = chatTimeline('lost');
    expect(tl.messages.some((m) => m.lost)).toBe(true);
    expect(tl.messages.filter((m) => m.from === 'alice' && m.to === 'gwa').length).toBeGreaterThanOrEqual(2);
    expect(tl.messages.filter((m) => m.label === 'append 42').length).toBe(1);
  });

  it('offline: a push wakes the phone, which syncs from its last number', () => {
    const tl = chatTimeline('offline');
    expect(tl.messages.some((m) => m.to === 'push')).toBe(true);
    expect(tl.messages.some((m) => m.label === 'have up to 41')).toBe(true);
  });
});

describe('chat: the bench', () => {
  it('polling every 5 s costs tens of millions of requests a second; a held connection does not', () => {
    const poll = chatLoad({ poll: 5, perServer: 100_000, groupSize: 20, copyPerMember: true });
    const held = chatLoad({ poll: 0, perServer: 100_000, groupSize: 20, copyPerMember: true });
    expect(poll.gatewayIn).toBeGreaterThan(30e6);
    expect(held.gatewayIn).toBeLessThan(poll.gatewayIn / 3);
    expect(poll.delayMs).toBeGreaterThan(2000);
    expect(held.delayMs).toBeLessThan(200);
  });

  it('a copy per member multiplies store writes by the group size', () => {
    const per = chatLoad({ poll: 0, perServer: 2e6, groupSize: 101, copyPerMember: true });
    const one = chatLoad({ poll: 0, perServer: 2e6, groupSize: 101, copyPerMember: false });
    expect(one.storeWrites).toBe(600_000);
    expect(per.storeWrites / one.storeWrites).toBeGreaterThan(25);
  });

  it('more connections a server means fewer servers and more phones dropped at once', () => {
    const small = chatLoad({ poll: 0, perServer: 50_000, groupSize: 5, copyPerMember: false });
    const big = chatLoad({ poll: 0, perServer: 2e6, groupSize: 5, copyPerMember: false });
    expect(small.servers).toBe(3000);
    expect(big.servers).toBe(75);
    expect(big.dropped).toBe(2e6);
  });
});

describe('chat: the figures', () => {
  it('estimate: done when the guess is in', async () => {
    let done = false;
    const h = FIGURES['chat-estimate'](context(), 'guess');
    h.done!.then(() => (done = true));
    guess(h.node, 'About 300,000');
    await Promise.resolve();
    expect(done).toBe(true);
  });

  it('send: done when the offline case is played to the end', async () => {
    let done = false;
    const h = FIGURES['chat-send'](context(), 'offline');
    h.done!.then(() => (done = true));
    setSlider(h.node, 0, 600);
    await Promise.resolve();
    expect(done).toBe(false);
    click(h.node, 'Bob offline');
    setSlider(h.node, 0, 600);
    await Promise.resolve();
    expect(done).toBe(true);
  });

  it('bench: done with held connections and one copy per conversation', async () => {
    let done = false;
    const h = FIGURES['chat-bench'](context(), 'held');
    h.done!.then(() => (done = true));
    click(h.node, 'Held connection');
    click(h.node, 'One copy per conversation');
    await Promise.resolve();
    expect(done).toBe(true);
  });
});
