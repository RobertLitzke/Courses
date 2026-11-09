// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { System } from '../src/model';
import { boxEdge, systemView } from '../src/view';
import { progress, sequenceView } from '../src/sequence';
import { lineChart } from '../src/chart';

const colors = { ink: '#111111', soft: '#666666', paper: '#ffffff', request: '#2255aa', answer: '#22aa55', error: '#cc2222', busy: '#aa8822' };

describe('the system view', () => {
  it('draws a part for each part and a dot for each message on a wire, and a tap fails a part', () => {
    const sys = new System({
      parts: [
        { id: 'c', kind: 'client', x: 40, y: 50, rps: 200 },
        { id: 'lb', kind: 'lb', x: 160, y: 50 },
        { id: 'a', kind: 'server', x: 280, y: 20 },
        { id: 'b', kind: 'db', x: 280, y: 80 },
      ],
      links: [
        { from: 'c', to: 'lb', ms: 20 },
        { from: 'lb', to: 'a', ms: 20 },
        { from: 'lb', to: 'b', ms: 20, bend: 10 },
      ],
      seed: 1,
    });
    const host = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    let tapped = '';
    const v = systemView(sys, host, { colors, tap: 'parts', onTap: (w) => (tapped = `${w.part}:${w.up}`) });
    sys.run(100);
    v.draw();
    expect(host.querySelectorAll('circle').length).toBeGreaterThan(0);
    const parts = host.querySelectorAll('g[role=button]');
    expect(parts.length).toBe(3); // the client can't be tapped
    (parts[0] as SVGElement).dispatchEvent(new Event('click'));
    expect(tapped).toBe('lb:false');
    expect(sys.part('lb').up).toBe(false);
  });

  it('finds where a line leaves a box', () => {
    expect(boxEdge(0, 0, 20, 10, 100, 0)).toEqual([10, 0]);
    expect(boxEdge(0, 0, 20, 10, 0, -50)).toEqual([0, -5]);
  });
});

describe('the message timeline', () => {
  it('draws messages up to now, and a lost one stops half way', () => {
    expect(progress({ from: 'a', to: 'b', send: 10, arrive: 20 }, 15)).toBeCloseTo(0.5);
    expect(progress({ from: 'a', to: 'b', send: 10, arrive: 20, lost: true }, 30)).toBe(0.5);
    const host = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const v = sequenceView(host, { x: 0, y: 0, w: 300, h: 200, tMax: 100, lanes: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }], colors });
    v.draw([{ from: 'a', to: 'b', send: 10, arrive: 30, label: 'prepare' }], [{ lane: 'b', at: 30, text: 'ok' }], 50);
    expect(host.textContent).toContain('prepare');
    expect(v.laneX('b')).toBeGreaterThan(v.laneX('a'));
  });
});

describe('the line chart', () => {
  it('maps data to the drawing and clips at the top', () => {
    const host = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const c = lineChart(host, { x: 10, y: 10, w: 100, h: 50, xMax: 10, yMax: 5, colors: { ink: '#000', soft: '#666', grid: '#eee' } });
    expect(c.px(5)).toBe(60);
    expect(c.py(100)).toBe(10);
    c.draw([{ label: 'p99', color: '#f00', points: [[0, 1], [5, 2], [10, 9]] }]);
    expect(host.querySelectorAll('path').length).toBeGreaterThan(1);
  });
});
