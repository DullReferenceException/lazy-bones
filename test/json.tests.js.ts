import LazyBones from '../lib/lazy-bones';

import { expect } from 'chai';

describe('The JSON representation of a LazyBones data set', () => {
  it('contains all resolved values so far', () => {
    const DataSource = LazyBones({
      a: ['b', ({ b }) => b * 2],
      b: () => 4,
      c: () => 38
    });

    const dataSet = DataSource();
    expect(dataSet.toJSON()).to.deep.equal({ });

    return dataSet.a().then(result => {
      expect(result).to.equal(8);
      expect(dataSet.toJSON()).to.deep.equal({
        a: 8,
        b: 4
      });
    })
  });
});