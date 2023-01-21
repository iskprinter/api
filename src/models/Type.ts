import { DataProxy } from "src/services";
import Model from "./Model";
import TypeData from "./TypeData";

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface Type extends TypeData { }
class Type extends Model implements TypeData {
  constructor(dataProxy: DataProxy, typeData: TypeData) {
    super(dataProxy);
    Object.assign(this, typeData);
  }
}
export default Type;
