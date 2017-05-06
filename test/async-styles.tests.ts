import LazyBones from '../lib/lazy-bones';

import { expect } from 'chai';

describe('lazy-bones methods', () => {
  it('can be synchronous return values', () => {
    const state = LazyBones({
      foo: () => 'bar'
    })();

    return state.foo().then(foo => {
      expect(foo).to.equal('bar');
    });
  });

  it('can asynchronously provide values via callbacks', () => {
    const state = LazyBones({
      foo: cb => cb(null, 'bar')
    })();

    return state.foo().then(foo => {
      expect(foo).to.equal('bar');
    });
  });

  it('can asynchronously provide values via Promises', () => {
    const state = LazyBones({
      foo: () => Promise.resolve('bar')
    })();

    return state.foo().then(foo => {
      expect(foo).to.equal('bar');
    });
  });
});
