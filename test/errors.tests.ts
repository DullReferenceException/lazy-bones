import LazyBones from '../lib/lazy-bones';
import { expect } from 'chai';

describe('lazy-bones errors when', () => {
  it('is has a data item spec with no valid paths', () => {
    expect(() => LazyBones<{ data: number }, {}>({
      data: []
    })).to.throw(Error);
  });

  it('attempts to load an invalid key', () => {
    const DataSource = LazyBones({ a: () => 1 });

    // TypeScript blocks this, so cast to force an invalid state
    const dataSet = <any>DataSource();

    return dataSet.get('b').then(() => {
      throw new Error('Unexpected successful call');
    }, err => {
      expect(err).to.exist;
    });
  });

  it('attempts to load data with required dependencies missing', () => {
    const DataSource = LazyBones<{ a: number }, { b: number }>({
      a: ['b', ({ b }) => b * 2]
    });

    DataSource().a().then(() => {
      throw new Error('Unexpected success');
    }, err => {
      expect(err).to.exist;
    });
  });
});
