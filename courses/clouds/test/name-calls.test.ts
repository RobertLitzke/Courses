import { describe, expect, it } from 'vitest';
import { nameOptions, dealNameCalls } from '../src/core/name-calls';
import { makeRng } from 'didactics/rng';

describe('name options', () => {
  it('include the answer and its look-alikes first', () => {
    for (let s = 0; s < 20; s++) {
      const o = nameOptions('cirrostratus', ['cirrus', 'altostratus', 'cumulus', 'stratus', 'cirrostratus'], 4, makeRng(s));
      expect(o).toHaveLength(4);
      expect(o).toContain('cirrostratus');
      expect(o).toContain('altostratus');
      expect(o).toContain('cirrus');
      expect(new Set(o).size).toBe(4);
    }
  });

  it('fills from all genera when few are known', () => {
    expect(nameOptions('cumulus', ['cumulus'], 4, makeRng(1))).toHaveLength(4);
  });

  it('deals calls with options', () => {
    const calls = dealNameCalls(['cumulus', 'stratus'], ['cumulus', 'stratus'], [], 4, 3, makeRng(2));
    expect(calls).toHaveLength(4);
    for (const c of calls) expect(c.options).toContain(c.genus);
  });
});
