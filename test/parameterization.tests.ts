import LazyBones from '../lib/lazy-bones';

import { expect } from 'chai';
import { stub } from 'sinon';

type DataType = {
  foo: number
}

describe('lazy-bones parameterized data sources', () => {
  it('is enabled via unspecified dependencies', () => {
    const fn = stub().returns('bar');
    const DataSource = LazyBones<DataType, { a: number }>({
      foo: ['a', ({ a }) => a * 2]
    });

    const state1 = DataSource({ a: 4 });
    const state2 = DataSource({ a: 8 });

    return Promise.all([state1.foo(), state2.foo()]).then(([ x, y ]) => {
      expect(x).to.equal(8);
      expect(y).to.equal(16);
    });
  });
});
