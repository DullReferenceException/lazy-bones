import { StateSpec, StateConstructor } from './model';
import Orchestrator from './orchestrator';

function LazyBones<T>(spec: StateSpec<T>) : StateConstructor<T> {
  const orchestrator = new Orchestrator(spec);
  return data => orchestrator.getInstance(data);
}

export default LazyBones;
