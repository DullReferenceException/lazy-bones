type DataSourceSpec<T> = {
  [K in keyof T]?: DataItemSpec<T, T[K]>
}

type DataItemSpec<T, V> =
  DependencyFreeFetchFn<V>
  | DependentFetchFn<T, V>
  | MultiPathDataItemSpec<T, V>

type DependencyFreeFetchFn<T> =
  ((cb: CallbackFn<T>) => void)
  | (() => T)
  | (() => Promise<T>)

type DependentFetchFn<T, V> =
  [keyof T, FetchFnWithDeps<T, V>]
  | [keyof T, keyof T, FetchFnWithDeps<T, V>]
  | [keyof T, keyof T, keyof T, FetchFnWithDeps<T, V>]
  | [keyof T, keyof T, keyof T, keyof T, FetchFnWithDeps<T, V>]
  | [keyof T, keyof T, keyof T, keyof T, keyof T, FetchFnWithDeps<T, V>]
  | [keyof T, keyof T, keyof T, keyof T, keyof T, keyof T, FetchFnWithDeps<T, V>]
  | [keyof T, keyof T, keyof T, keyof T, keyof T, keyof T, keyof T, FetchFnWithDeps<T, V>]
  | [keyof T, keyof T, keyof T, keyof T, keyof T, keyof T, keyof T, keyof T, FetchFnWithDeps<T, V>]
  | [keyof T, keyof T, keyof T, keyof T, keyof T, keyof T, keyof T, keyof T, keyof T, FetchFnWithDeps<T, V>]
  | [keyof T, keyof T, keyof T, keyof T, keyof T, keyof T, keyof T, keyof T, keyof T, keyof T, FetchFnWithDeps<T, V>]

type FetchFnWithDeps<T, V> =
  ((deps: Dependencies<T>) => V)
  | ((deps: Dependencies<T>) => Promise<V>)
  | ((deps: Dependencies<T>, cb : CallbackFn<V>) => void)

type Dependencies<T> = {
  [K in keyof T]?: T[K]
}

type CallbackFn<T> = (err?: Error, value?: T) => void

type MultiPathDataItemSpec<T, V> = Array<DependentFetchFn<T, V>>

type DataSetConstructor<T> =
  ((dependencies?: Dependencies<T>) => DataSet<T>)
  & TypedEventEmitter<{ timing: TimingEvent<T> }>

interface TypedEventEmitter<T> {
  addListener<K extends keyof T>(event: K, listener: (arg: T[K]) => any): this;
  on<K extends keyof T>(event: K, listener: (arg: T[K]) => any): this;
  once<K extends keyof T>(event: K, listener: (arg: T[K]) => any): this;
  removeListener<K extends keyof T>(event: K, listener: (arg: T[K]) => any): this;
  removeAllListeners<K extends keyof T>(event?: K): this;
  setMaxListeners(n: number): this;
  getMaxListeners(): number;
  listeners<K extends keyof T>(event: K): ((arg: T[K]) => any)[];
  emit<K extends keyof T>(event: K, arg: T[K]): boolean;
  listenerCount<K extends keyof T>(type: K): number;
  // Added in Node 6...
  prependListener<K extends keyof T>(event: K, listener: (arg: T[K]) => any): this;
  prependOnceListener<K extends keyof T>(event: K, listener: (arg: T[K]) => any): this;
  eventNames(): (string | symbol)[];
}

interface TimingEvent<T> {
  name: keyof T,
  dependencies: Array<keyof T>,
  requestStart: number,
  waitDuration: number,
  fetchStart: number,
  fetchDuration: number,
  totalDuration: number
}

type DataSet<T> = {
  [K in keyof T]: (cb?: CallbackFn<T[K]>) => Promise<T[K]>
} & {
  get: (...args: Array<keyof T | CallbackFn<Dependencies<T>>>) => Promise<Dependencies<T>>
}

export {
  TypedEventEmitter, TimingEvent,
  DataSourceSpec, DataItemSpec, MultiPathDataItemSpec,
  DependencyFreeFetchFn, DependentFetchFn, Dependencies, FetchFnWithDeps, CallbackFn,
  DataSetConstructor, DataSet
}
