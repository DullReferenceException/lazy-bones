import { DataSourceSpec, DataSetConstructor } from './model';
import Orchestrator from './orchestrator';

function LazyBones<T>(spec: DataSourceSpec<T>) : DataSetConstructor<T> {
  const orchestrator = new Orchestrator(spec);

  let constructor = data => orchestrator.getInstance(data);

  return Object.setPrototypeOf(constructor, orchestrator.emitter);
}

export default LazyBones;
