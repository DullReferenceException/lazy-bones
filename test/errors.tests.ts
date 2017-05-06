import LazyBones from '../lib/lazy-bones';
import { expect } from 'chai';
import { DataSet, DataSetConstructor } from "../lib/model";

describe('lazy-bones errors when', () => {
  it('is has a data item spec with no valid paths', () => {
    expect(() => LazyBones<{ data: number }>({
      data: []
    })).to.throw(Error);
  });

  it('an attempt to load an invalid key occurs', () => {
    const DataSource = LazyBones({ a: () => 1 });

    // TypeScript blocks this, so cast to force an invalid state
    const dataSet = <any>DataSource();

    return dataSet.get('b').then(() => {
      throw new Error('Unexpected successful call');
    }, err => {
      expect(err).to.exist;
    });
  });
});