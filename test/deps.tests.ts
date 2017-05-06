import LazyState from '../lib/lazy-bones';

import { expect } from 'chai';

describe('lazy-bones dependency resolution', () => {
  it('works for direct dependencies', () => {
    const state = LazyState({
      a: () => 2,
      b: () => 3,
      c: ['a', 'b', ({ a, b }) => a * b]
    })();

    return state.c().then(c => {
      expect(c).to.equal(6);
    });
  });

  it('works recursively', () => {
    const state = LazyState({
      a: () => 2,
      b: () => 3,
      c: ['a', 'b', ({ a, b }) => a * b],
      d: ['c', ({ c }) => c * c]
    })();

    return state.d().then(d => {
      expect(d).to.equal(36);
    });
  });
});
