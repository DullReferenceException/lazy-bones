import * as events from 'events';
import * as Promise from 'bluebird';
import {
  DataSourceSpec,
  Dependencies, DependentFetchFn, FetchFnWithDeps,
  TypedEventEmitter, TimingEvent
} from './model';
import mapObject from './map-object';

interface Stats {
  avg: number,
  count: number
}

type NormalizedStateSpec<T> = {
  [K in keyof T]: NormalizedSpec<T, T[K]>
}

type NormalizedSpec<T, V> = {
  paths: Array<NormalizedPath<T, V>>
}

type NormalizedPath<T, V> = {
  dependencies: Array<keyof T>,
  fn: FetchFnWithDeps<T, V>
}

type StatsMap = Map<Function, Stats>;

type OrchestratorEventEmitter<T> = TypedEventEmitter<{ timing: TimingEvent<T> }>;

class Orchestrator<T, U> {
  public readonly emitter: OrchestratorEventEmitter<T>;
  private readonly spec: NormalizedStateSpec<T>;
  private readonly stats: StatsMap;

  constructor(spec: DataSourceSpec<T, U>) {
    this.emitter = <OrchestratorEventEmitter<T>>new events.EventEmitter();
    this.spec = <NormalizedStateSpec<T>>mapObject(spec, (key : keyof T) => this.normalizeSpec(spec[key]));
    this.stats = new Map();
  }

  normalizeSpec(spec) {
    if (typeof spec === 'function') {
      const fn = spec;
      return {
        paths: [
          {
            dependencies: [],
            fn: fn.length ? ((_, cb?) => fn(cb)) : ((_: Dependencies<T>) => fn())
          }
        ]
      };
    }

    if (!(spec[0] instanceof Array)) {
      return {
        paths: [
          this.normalizeDependentFn(spec)
        ]
      };
    }

    return {
      paths: spec.map((s) => this.normalizeDependentFn(s))
    };
  }

  normalizeDependentFn<V>(depFn : DependentFetchFn<T, V>) : NormalizedPath<T, V> {
    const dependencies = <Array<keyof T>>(depFn.slice(0, -1));

    const fn = <FetchFnWithDeps<T, V>>(depFn[depFn.length - 1]);
    if (typeof(fn) !== 'function') {
      throw new Error(`Invalid dependent function specification ${JSON.stringify(depFn)}.`);
    }

    return { dependencies, fn };
  }

  resolve(key, cache, cb?) {
    if (!(key in cache)) {
      if (!(key in this.spec)) {
        return Promise.reject(`${key} is not defined in the data source`);
      }

      cache[key] = this.fetchResult(key, cache).then(result => {
        return cache[key] = result;
      }, err => {
        delete cache[key];
        throw err;
      });
    }

    return Promise.resolve(cache[key]).asCallback(cb);
  }

  fetchResult(key, cache) {
    const reachablePaths = this.getPrioritizedPaths(key, cache)
      .filter(({ cost }) => cost < Number.POSITIVE_INFINITY);
    if (!reachablePaths.length) {
      return Promise.reject(`Cannot resolve ${key}`);
    }

    return reachablePaths.reduce((chain, { path }) => {
      return chain.catch(() => {
        return this.resolvePath(cache, key, path);
      });
    }, this.resolvePath(cache, key, reachablePaths[0].path));
  }

  resolvePath(cache, key, { dependencies, fn }) {
    return this.fetchDependentResult(cache, key, dependencies, fn);
  }

  fetchDependentResult(cache, name, dependencies, fn) {
    const requestStart = Date.now();
    let fetchStart = requestStart;

    const task = dependencies.length ?
      Promise.all(dependencies.map(dep => this.resolve(dep, cache))).then((values) => {
        const depsObj = dependencies.reduce((result, dep, i) => Object.assign(result, { [dep]: values[i] }), {});

        fetchStart = Date.now();

        return this.execute(fn, depsObj);
      }) : this.execute(fn, {});

    return task.then(result => {
      const now = Date.now();
      this.emitter.emit('timing', {
        name,
        dependencies,
        requestStart,
        waitDuration: fetchStart - requestStart,
        fetchStart,
        fetchDuration: now - fetchStart,
        totalDuration: now - requestStart
      });

      return result;
    });
  }

  execute(fn, deps) {
    const startTime = Date.now();
    const promise = (fn.length > 1)
      ? Promise.fromCallback(cb => fn(deps, cb))
      : Promise.try(() => fn(deps));

    return promise.then(result => {
      this.recordCost(fn, Date.now() - startTime);
      return result;
    }, err => {
      this.recordCost(fn, Number.MAX_SAFE_INTEGER);
      throw err;
    });
  }

  recordCost(fn, amount) {
    const priorStats = this.stats.get(fn) || { count: 0, avg: 0 };
    const newCount = priorStats.count + 1;
    this.stats.set(fn, {
      count: newCount,
      avg: (priorStats.avg * priorStats.count + amount) / newCount
    });
  }

  getPrioritizedPaths(key, cache) {
    const visited = {};
    const costedPaths = this.getCostedPaths(key, cache, visited);
    costedPaths.sort(({ cost: costA }, { cost: costB }) => costA - costB);
    return costedPaths;
  }

  getCostedPaths(key, cache, visited) {
    visited = Object.assign({}, visited, { [key]: true });

    return this
      .spec[key]
      .paths
      .map(path => ({ cost: this.getCost(path, cache, visited), path }));
  }

  getCost<V>({ dependencies, fn }, cache: { [K in keyof T]: Promise<T[K]> }, visited: { [key: string]: boolean }) : number {
    const stats = this.stats.get(fn);
    const selfCost = (stats && stats.avg) || Number.EPSILON;

    return selfCost + dependencies.reduce((sum, dep: keyof T) => {
      let cost = 0;
      if (!(dep in cache)) {

        if (!(dep in this.spec) || dep in visited) {
          return Number.POSITIVE_INFINITY;
        }

        const costedPaths = this.getCostedPaths(dep, cache, visited);
        cost = costedPaths.reduce((champ, challenger) => challenger.cost < champ.cost ? challenger : champ).cost;
      }

      return sum + cost;
    }, 0);
  }

  mapSpec(fn) {
    return mapObject(this.spec, fn);
  }
}

export default Orchestrator;
