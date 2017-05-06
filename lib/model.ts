type StateSpec<T> = {
  [K in keyof T]?: DataSpec<T, T[K]>
}

type DataSpec<T, V> =
  DependencyFreeFn<V>
  | DependentFn<T, V>
  | MultiChoiceDataSpec<T, V>

type DependencyFreeFn<T> =
  ((cb: CallbackFn<T>) => void)
  | (() => T)
  | (() => Promise<T>)

type DependentFn<T, V> =
  [keyof T, DependencyFn<T, V>]
  | [keyof T, keyof T, DependencyFn<T, V>]
  | [keyof T, keyof T, keyof T, DependencyFn<T, V>]
  | [keyof T, keyof T, keyof T, keyof T, DependencyFn<T, V>]
  | [keyof T, keyof T, keyof T, keyof T, keyof T, DependencyFn<T, V>]
  | [keyof T, keyof T, keyof T, keyof T, keyof T, keyof T, DependencyFn<T, V>]
  | [keyof T, keyof T, keyof T, keyof T, keyof T, keyof T, keyof T, DependencyFn<T, V>]
  | [keyof T, keyof T, keyof T, keyof T, keyof T, keyof T, keyof T, keyof T, DependencyFn<T, V>]
  | [keyof T, keyof T, keyof T, keyof T, keyof T, keyof T, keyof T, keyof T, keyof T, DependencyFn<T, V>]
  | [keyof T, keyof T, keyof T, keyof T, keyof T, keyof T, keyof T, keyof T, keyof T, keyof T, DependencyFn<T, V>]

type DependencyFn<T, V> =
  ((deps: Dependencies<T>) => V)
  | ((deps: Dependencies<T>) => Promise<V>)
  | ((deps: Dependencies<T>, cb : CallbackFn<V>) => void)

type Dependencies<T> = {
  [K in keyof T]?: T[K]
}

type CallbackFn<T> = (err?: Error, value?: T) => void

type MultiChoiceDataSpec<T, V> = Array<DependentFn<T, V>>

type StateConstructor<T> = (dependencies?: Dependencies<T>) => StateInstance<T>

type StateInstance<T> = {
  [K in keyof T]: (cb?: CallbackFn<T[K]>) => Promise<T[K]>
} & {
  get: (...args: Array<keyof T | CallbackFn<Dependencies<T>>>) => Promise<Dependencies<T>>
}

export {
  StateSpec, DataSpec, MultiChoiceDataSpec,
  DependencyFreeFn, DependentFn, Dependencies, DependencyFn, CallbackFn,
  StateConstructor, StateInstance }
