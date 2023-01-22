import { DataProxy } from "src/services";
import ModelData from "./ModelData";

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface Model extends ModelData { }
abstract class Model implements ModelData {
  constructor(public _dataProxy: DataProxy) { }
  toJSON() {
    return { ...this, _dataProxy: undefined };
  }
}
export default Model;
