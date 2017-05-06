import LazyState from '../lib/lazy-bones';

import { expect } from 'chai';

type DataType = { foo: string }

describe('The lazy-bones get method', () => {
  it('can return the result via a callback', done => {
    const state = LazyState<DataType>({
      foo: () => 'bar'
    })();

    state.get('foo', (err, results) => {
      expect(results).to.have.property('foo', 'bar');
      done();
    });
  });

  it('can return the result as a Promise', () => {
    const state = LazyState<DataType>({
      foo: () => 'bar'
    })();

    return state.get('foo').then(results => {
      expect(results).to.have.property('foo', 'bar');
    });
  });
});
