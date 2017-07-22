import { DataSourceSpec, DataSetConstructor } from './model';
import Orchestrator from './orchestrator';
import Orchestration from './orchestration';

function LazyBones<T, U>(spec: DataSourceSpec<T, U>) : DataSetConstructor<T, U> {
  const orchestrator = new Orchestrator(spec);

  return Object.setPrototypeOf(Orchestration(orchestrator), orchestrator.emitter);
}

export default LazyBones;
