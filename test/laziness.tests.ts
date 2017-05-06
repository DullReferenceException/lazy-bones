import LazyBones from '../lib/lazy-bones';

import { expect } from 'chai';
import { stub } from 'sinon';

describe('lazy-bones laziness', () => {
  it('avoids executing anything until invoked', done => {
    const fn = stub().returns('bar');

    const state = LazyBones({
      foo: fn
    })();

    setImmediate(() => {
      expect(fn).to.have.not.been.called;
      done();
    });
  });

  it('caches results', () => {
    const fn : (() => string) = stub().returns('bar');

    const state = LazyBones({
      foo: fn
    })();

    return Promise.all([ state.foo(), state.foo() ]).then(() => {
      expect(fn).to.have.been.calledOnce;
    });
  });
});
