import LazyState from '../lib/lazy-bones';

import { expect } from 'chai';
import { spy } from 'sinon';
import { MultiChoiceDataSpec } from "../lib/model";

describe('lazy-bones path optimization', () => {
  it('starts by assuming all costs are equal, thus selecting the smallest number of steps', () => {
    type DataTypes = {
      a: number,
      b: number,
      c: number,
      d: number,
      e: number,
      target: number
    };

    const a: () => number = spy(() => 1);
    const b: () => number = spy(() => 2);
    const c: () => number = spy(() => 3);
    const d: () => number = spy(() => 3);
    const e: () => number = spy(() => 3);
    const target: MultiChoiceDataSpec<DataTypes, number> = [
      ['a', 'b', 'c', ({ a, b, c }) => a + b + c],
      ['d', 'e', ({ d, e }) => d + e]
    ];

    const state = LazyState<DataTypes>({
      a, b, c, d, e,
      target
    })();

    return state.target().then(result => {
      expect(result).to.equal(6);
      expect(a).to.have.not.been.called;
      expect(b).to.have.not.been.called;
      expect(c).to.have.not.been.called;
    });
  });

  it('keeps statistics on actual execution times, so the fastest routes are preferred', () => {
    type DataTypes = { a: number, b: number, target: number };

    const a = spy(cb => setTimeout(() => cb(null, 5), 10));
    const b = spy(cb => setTimeout(() => cb(null, 5), 20));
    const State = LazyState<DataTypes>({
      a, b,
      target: <MultiChoiceDataSpec<DataTypes, number>>[
        ['a', ({ a }) => a * 2],
        ['b', ({ b }) => b * 2]
      ]
    });

    return State().target().then(result => {
      // At first, a & b being equal, we would have run "a" only
      expect(result).to.equal(10);
      expect(a).to.have.been.called;
      expect(b).to.have.not.been.called;
      a.reset();

      return State().target();
    }).then(result => {
      // Now, we know the cost of a, but not b, so we'll try "b"
      expect(result).to.equal(10);
      expect(a).to.have.not.been.called;
      expect(b).to.have.been.called;
      b.reset();

      return State().target();
    }).then(result => {
      // Now, we know that a is faster than b, so we'll only call a
      expect(result).to.equal(10);
      expect(a).to.have.been.called;
      expect(b).to.have.not.been.called;
    });
  });

  it('avoids paths that yield errors', () => {
    type DataTypes = { a: number, b: number, target: number };

    let aThrows = false;

    const a = spy(cb => {
      if (aThrows) {
        return void cb(new Error('Boom!'));
      }

      setTimeout(() => cb(null, 5), 10)
    });
    const b = spy(cb => setTimeout(() => cb(null, 5), 20));
    const State = LazyState<DataTypes>({
      a, b,
      target: <MultiChoiceDataSpec<DataTypes, number>>[
        ['a', ({ a }) => a * 2],
        ['b', ({ b }) => b * 2]
      ]
    });

    return State().target().then(result => {
      // At first, a & b being equal, we would have run "a" only
      expect(result).to.equal(10);
      expect(a).to.have.been.called;
      expect(b).to.have.not.been.called;
      a.reset();

      return State().target();
    }).then(result => {
      // Now, we know the cost of a, but not b, so we'll try "b"
      expect(result).to.equal(10);
      expect(a).to.have.not.been.called;
      expect(b).to.have.been.called;
      b.reset();

      return State().target();
    }).then(result => {
      // Now, we know that a is faster than b, so we'll only call a
      expect(result).to.equal(10);
      expect(a).to.have.been.called;
      expect(b).to.have.not.been.called;
      a.reset();

      aThrows = true;
      return State().target();
    }).then(result => {
      // Now, we tried a, which failed, then b as a fallback
      expect(result).to.equal(10);
      expect(a).to.have.been.called;
      expect(b).to.have.been.called;
      a.reset();
      b.reset();

      return State().target();
    }).then(result => {
      // This time, even though a is faster, we'll use b since a has proven unreliable
      expect(result).to.equal(10);
      expect(a).to.have.not.been.called;
      expect(b).to.have.been.called;
    });
  });

  it('recursively bases costs on nested dependencies', () => {
    type DataTypes = {
      a: number,
      a1: number,
      a2: number,
      a3: number,
      b: number,
      c: number,
      d: number,
      e: number,
      target: number
    };

    const a = spy(({ a1, a2, a3 }) => a1 + a2 + a3);
    const b: () => number = spy(() => 2);
    const c: () => number = spy(() => 3);
    const d : MultiChoiceDataSpec<DataTypes, number> = [
      ['a', ({ a }) => a * 2],
      ['b', 'c', ({ b, c }) => (b + c) * 2],
      ['a', 'b', 'c', ({ b, c }) => (b + c) * 2]
    ];
    const e = spy(() => 10);
    const target : MultiChoiceDataSpec<DataTypes, number> = [
      ['d', ({ d }) => d * 3],
      ['e', ({ e }) => e * 3]
    ];

    const state = LazyState<DataTypes>({
      a: ['a1', 'a2', 'a3', a],
      a1: () => 1,
      a2: () => 1,
      a3: () => 3,
      b, c,
      d, e,
      target
    })();

    return state.target().then(value => {
      expect(value).to.equal(30);
      expect(a).to.have.not.been.called;
    });
  })
});
