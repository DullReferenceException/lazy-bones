import LazyBones from '../lib/lazy-bones';

import { spy, useFakeTimers } from 'sinon';
import { expect } from 'chai';

describe('The lazy-bones timing event', () => {
  it('reports the expected timings', () => {
    const clock = useFakeTimers();

    const waitTimes = {
      a: 289,
      b: 842,
      c: 29,
      d: 292
    };

    const DataSource = LazyBones({
      a(cb) {
        setTimeout(() => {
          cb(null, 1);
        }, waitTimes.a);
      },
      b(cb) {
        setTimeout(() => {
          cb(null, 2);
        }, waitTimes.b);
      },
      c: ['a', 'b', ({ a, b }, cb) => {
        setTimeout(() => {
          cb(null, a + b);
        }, waitTimes.c);
      }],
      d: ['c', ({ c }, cb) => {
        setTimeout(() => {
          cb(null, c * 2);
        }, waitTimes.d);
      }]
    });

    const timingEvent = spy();
    DataSource.on('timing', timingEvent);

    const dataSet = DataSource();

    const tasks = dataSet.d();

    return Promise.resolve().then(() => {
      return Promise.resolve()
    }).then(() => {
      clock.tick(waitTimes.a + waitTimes.b + waitTimes.c + waitTimes.d);
      return tasks;
    }).then(result => {
      expect(result).to.equal(6);

      let time = 0;

      expect(timingEvent).to.have.been.calledWithMatch({
        name: 'a',
        dependencies: [],
        requestStart: 0,
        waitDuration: 0,
        fetchStart: 0,
        fetchDuration: waitTimes.a,
        totalDuration: waitTimes.a
      });

      expect(timingEvent).to.have.been.calledWithMatch({
        name: 'b',
        dependencies: [],
        requestStart: 0,
        waitDuration: 0,
        fetchStart: 0,
        fetchDuration: waitTimes.b,
        totalDuration: waitTimes.b
      });

      expect(timingEvent).to.have.been.calledWithMatch({
        name: 'c',
        dependencies: ['a', 'b'],
        requestStart: 0,
        waitDuration: Math.max(waitTimes.a, waitTimes.b),
        fetchStart: Math.max(waitTimes.a, waitTimes.b),
        fetchDuration: waitTimes.c,
        totalDuration: Math.max(waitTimes.a, waitTimes.b) + waitTimes.c
      });

      expect(timingEvent).to.have.been.calledWithMatch({
        name: 'd',
        dependencies: ['c'],
        requestStart: 0,
        waitDuration: Math.max(waitTimes.a, waitTimes.b) + waitTimes.c,
        fetchStart: Math.max(waitTimes.a, waitTimes.b) + waitTimes.c,
        fetchDuration: waitTimes.d,
        totalDuration: Math.max(waitTimes.a, waitTimes.b) + waitTimes.c + waitTimes.d
      });

    }).then(() => {
      clock.restore();
    }, err => {
      clock.restore();
      throw err;
    });
  });
});
