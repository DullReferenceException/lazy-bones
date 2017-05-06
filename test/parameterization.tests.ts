import LazyState from '../lib/lazy-bones';

import { expect } from 'chai';
import { stub } from 'sinon';

type DataType = {
  a: number,
  foo: number
}

describe('lazy-bones parameterized state', () => {
  it('is enabled via unspecified dependencies', () => {
    const fn = stub().returns('bar');
    const State = LazyState<DataType>({
      foo: ['a', ({ a }) => a * 2]
    });

    const state1 = State({ a: 4 });
    const state2 = State({ a: 8 });

    return Promise.all([state1.foo(), state2.foo()]).then(([ x, y ]) => {
      expect(x).to.equal(8);
      expect(y).to.equal(16);
    });
  });
});
