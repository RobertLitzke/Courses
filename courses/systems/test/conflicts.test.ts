// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { FIGURES } from '../src/figures';
import { applyCrdt, applyOp, compareClocks, crdtText, editRun, joinClocks, mergeCart, orAdd, orItems, orMerge, orRemove, transform, type CrdtOp, type Letter, type ORSet } from '../src/figures/conflicts';
import { click, context, setSlider } from './helpers';

describe('conflicts: vector clocks', () => {
  it('tells before, after, equal and concurrent', () => {
    expect(compareClocks({ X: 1 }, { X: 2 })).toBe('before');
    expect(compareClocks({ A: 3, B: 1 }, { A: 2, B: 1 })).toBe('after');
    expect(compareClocks({ A: 1 }, { A: 1, B: 0 })).toBe('equal');
    expect(compareClocks({ X: 2 }, { X: 1, Y: 1 })).toBe('concurrent');
    expect(compareClocks({ A: 2, B: 1 }, { A: 1, B: 2 })).toBe('concurrent');
  });

  it('a merged clock has seen both', () => {
    const j = joinClocks({ X: 2 }, { X: 1, Y: 1 });
    expect(compareClocks({ X: 2 }, j)).toBe('before');
    expect(compareClocks({ X: 1, Y: 1 }, j)).toBe('before');
  });
});

describe('conflicts: the cart', () => {
  it('last writer wins loses the kettle; union brings the book back; the OR-set is right', () => {
    expect(mergeCart('Last writer wins')).toMatchObject({ cart: [], lost: ['kettle'] });
    expect(mergeCart('Keep both')).toMatchObject({ cart: null, siblings: [['book', 'kettle'], []] });
    expect(mergeCart('Union')).toMatchObject({ cart: ['book', 'kettle'], back: ['book'] });
    expect(mergeCart('Add and remove sets')).toMatchObject({ cart: ['kettle'], lost: [], back: [] });
  });

  it('the OR-set merge is order-free and keeps a concurrent re-add', () => {
    const s: ORSet = { adds: [{ tag: 'X1', item: 'book' }], removed: [] };
    const a = orAdd(orAdd(s, 'kettle', 'X2'), 'book', 'X3');
    const b = orRemove(s, 'book');
    expect(orItems(orMerge(a, b))).toEqual(['book', 'kettle']);
    expect(orItems(orMerge(b, a))).toEqual(orItems(orMerge(a, b)));
    expect(orItems(orMerge(a, a))).toEqual(orItems(a));
  });
});

describe('conflicts: shared editing', () => {
  it('applied as sent, the screens disagree', () => {
    const r = editRun('Apply as sent');
    expect([r.alice, r.bob]).toEqual(['chat', 'char']);
  });

  it('transformed or as a CRDT, both screens read "char"', () => {
    for (const m of ['Transform', 'CRDT'] as const) {
      const r = editRun(m);
      expect(r.alice).toBe('char');
      expect(r.bob).toBe('char');
    }
  });

  it('transformation converges for every pair of single edits on a short word', () => {
    const word = 'abcd';
    const ops = [
      ...[0, 1, 2, 3, 4].map((at) => ({ kind: 'insert' as const, at, ch: 'X' })),
      ...[0, 1, 2, 3].map((at) => ({ kind: 'delete' as const, at })),
    ];
    for (const a of ops)
      for (const b of ops) {
        const b2 = transform(b, a, false);
        const a2 = transform(a, b, true);
        const one = b2 ? applyOp(applyOp(word, a), b2) : applyOp(word, a);
        const two = a2 ? applyOp(applyOp(word, b), a2) : applyOp(word, b);
        expect(one).toBe(two);
      }
  });

  it('CRDT inserts at one spot land in the same order everywhere', () => {
    const doc: Letter[] = [...'ab'].map((ch, i) => ({ id: `${i + 1}`, ch, gone: false }));
    const p: CrdtOp = { kind: 'insert', after: '1', id: 'p1', ch: 'P' };
    const q: CrdtOp = { kind: 'insert', after: '1', id: 'q1', ch: 'Q' };
    expect(crdtText(applyCrdt(applyCrdt(doc, p), q))).toBe(crdtText(applyCrdt(applyCrdt(doc, q), p)));
  });
});

describe('conflicts: the figures', () => {
  it('the cart is done with add and remove sets played through', async () => {
    let done = false;
    const h = FIGURES['conflicts-cart'](context(), 'kept');
    h.done!.then(() => (done = true));
    setSlider(h.node, 0, 480);
    await Promise.resolve();
    expect(done).toBe(false);
    expect(h.node.textContent).toContain('kettle');
    click(h.node, 'Add and remove sets');
    await Promise.resolve();
    expect(done).toBe(true);
  });

  it('the editing figure is done when the screens agree', async () => {
    let done = false;
    const h = FIGURES['conflicts-edit'](context(), 'converge');
    h.done!.then(() => (done = true));
    setSlider(h.node, 0, 300);
    await Promise.resolve();
    expect(done).toBe(false);
    click(h.node, 'CRDT');
    await Promise.resolve();
    expect(done).toBe(true);
  });
});
