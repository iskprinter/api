import { DataProxy } from "src/services";
import EveModel from "./EveModel";
import Region from "./Region";
import SystemData from "./SystemData";

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface System extends SystemData { }
class System extends EveModel implements SystemData {
  constructor(dataProxy: DataProxy, systemData: SystemData) {
    super(dataProxy);
    Object.assign(this, systemData);
  }

  async getRegion(): Promise<Region> {
    const constellation = (await this._dataProxy.getConstellations({ systems: this.system_id }))[0]
    const region = await constellation.getRegion();
    return region;
  }
}
export default System;
