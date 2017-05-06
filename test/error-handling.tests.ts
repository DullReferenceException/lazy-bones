import LazyState from '../lib/lazy-bones';
import { DataSourceSpec } from '../lib/model';

import { expect } from 'chai';

describe('lazy-bones error handling', () => {
  const scenarios: Array<{ type: string, cfg: DataSourceSpec<{ a: number, b: number, c: number }> }> = [
    {
      type: 'synchronous',
      cfg: {
        a: () => 2,
        b: () => { throw new Error('Boom!') },
        c: ['a', 'b', ({ a, b }) => a * b]
      }
    },
    {
      type: 'callback',
      cfg: {
        a: () => 2,
        b: cb => { cb(new Error('Boom!')) },
        c: ['a', 'b', ({ a, b }) => a * b]
      }
    },
    {
      type: 'Promise',
      cfg: {
        a: () => 2,
        b: () => Promise.reject(new Error('Boom!')),
        c: ['a', 'b', ({ a, b }) => a * b]
      }
    }
  ];

  scenarios.forEach(({ type, cfg }) => {
    describe(`of ${type} errors`, () => {
      const state = LazyState(cfg)();

      it('works for Promise-style callers', () => {
        return state.c().then(() => {
          throw new Error('Expected error but did not get one');
        }, err => {
          expect(err).to.exist;
        });
      });

      it('works for Callback-style callers', done => {
        state.c(err => {
          expect(err).to.exist;
          done();
        });
      });

      it('works for Promise-style get callers', () => {
        return state.get('c').then(() => {
          throw new Error('Expected error but did not get one');
        }, err => {
          expect(err).to.exist;
        });
      });

      it('works for callback-style get callers', done => {
        state.get('c', err => {
          expect(err).to.exist;
          done();
        });
      });
    });
  });
});
