import { DataProxy } from "src/services";
import EveModel from "./EveModel";
import TypeData from "./TypeData";

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface Type extends TypeData { }
class Type extends EveModel implements TypeData {
  constructor(dataProxy: DataProxy, typeData: TypeData) {
    super(dataProxy);
    Object.assign(this, typeData);
  }
}
export default Type;
