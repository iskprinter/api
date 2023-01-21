import { DataProxy } from "src/services";
import Model from "./Model";
import SystemData from "./SystemData";

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface System extends SystemData { }
class System extends Model implements SystemData {
  constructor(dataProxy: DataProxy, systemData: SystemData) {
    super(dataProxy);
    Object.assign(this, systemData);
  }
}
export default System;
