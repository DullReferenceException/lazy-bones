import * as Promise from 'bluebird';
import {
  StateSpec,
  Dependencies, DependentFn, DependencyFn,
  StateInstance
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
  fn: DependencyFn<T, V>
}

type StatsMap = Map<Function, Stats>;

class Orchestrator<T> {
  private readonly spec: NormalizedStateSpec<T>;
  private readonly stats: StatsMap;

  constructor(spec: StateSpec<T>) {
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

  normalizeDependentFn<V>(depFn : DependentFn<T, V>) : NormalizedPath<T, V> {
    const dependencies = <Array<keyof T>>(depFn.slice(0, -1));
    const fn = <DependencyFn<T, V>>(depFn[depFn.length - 1]);
    return { dependencies, fn };
  }

  getInstance(values) {
    return Orchestration<T>(this, values || {});
  }

  resolve(key, cache, cb?) {
    const promise = cache[key] || (cache[key] = this.fetchResult(key, cache)).catch(err => {
      delete cache[key];
      throw err;
    });

    return Promise.resolve(promise).asCallback(cb);
  }

  fetchResult(key, cache) {
    const paths = this.getPrioritizedPaths(key, cache);
    return paths.reduce((chain, { path: { dependencies, fn } }) => {
      return chain.catch(() => this.fetchDependentResult(cache, dependencies, fn));
    }, Promise.reject());
  }

  fetchDependentResult(cache, dependencies, fn) {
    return Promise.all(dependencies.map(dep => this.resolve(dep, cache))).then((values) => {
      const depsObj = dependencies.reduce((result, dep, i) => Object.assign(result, { [dep]: values[i] }), {});
      return this.execute(fn, depsObj);
    });
  }

  execute(fn, deps) {
    const startTime = Date.now();
    const promise = (fn.length > 1)
      ? Promise.fromCallback(cb => fn(deps, cb))
      : Promise.resolve(fn(deps));

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
    const costedPaths = this.getCostedPaths(key, cache);
    costedPaths.sort(({ cost: costA }, { cost: costB }) => costA - costB);
    return costedPaths;
  }

  getCostedPaths(key, cache) {
    return this
      .spec[key]
      .paths
      .map(path => ({ cost: this.getCost(path, cache), path }));
  }

  getCost<V>({ dependencies, fn }, cache: { [K in keyof T]: Promise<T[K]> }) : number {
    const stats = this.stats.get(fn);
    const selfCost = (stats && stats.avg) || Number.EPSILON;

    return selfCost + dependencies.reduce((sum, dep: keyof T) => {
      let cost = 0;
      if (!(dep in cache)) {
        const costedPaths = this.getCostedPaths(dep, cache);
        cost = costedPaths.reduce((champ, challenger) => challenger.cost < champ.cost ? challenger : champ).cost;
      }

      return sum + cost;
    }, 0);
  }

  mapSpec(fn) {
    return mapObject(this.spec, fn);
  }
}

function Orchestration<T>(orchestrator: Orchestrator<T>, initialData: { [K in keyof T]?: T[K] }) : StateInstance<T> {
  const cache = mapObject(initialData, key => Promise.resolve(initialData[key]));

  const methods: { [K in keyof T]?: Promise<T[K]> } = orchestrator.mapSpec(key => {
    return cb => {
      return orchestrator.resolve(key, cache, cb);
    };
  });

  return Object.assign(methods, {
    get(...args) {
      if (typeof(args[args.length - 1]) === 'function') {
        return Promise.resolve(orchestrator.fetchDependentResult(cache, args.slice(0, -1), results => results))
          .asCallback(args[args.length - 1]);
      } else {
        return orchestrator.fetchDependentResult(cache, args, results => results);
      }
    }
  });
}

export default Orchestrator;
