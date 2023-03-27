import { DataProxy } from "src/services";
import ConstellationData from "./ConstellationData";
import EveModel from "./EveModel";
import Region from "./Region";

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface Constellation extends ConstellationData { }
class Constellation extends EveModel implements ConstellationData {
  constructor(dataProxy: DataProxy, constellationData: ConstellationData) {
    super(dataProxy);
    Object.assign(this, constellationData);
  }

  async getRegion(): Promise<Region> {
    if (!this.region_id) {
      throw new Error('Constellation was unable to get region because constellation data was incomplete.');
    }
    const region = await this._dataProxy.getRegion(this.region_id);
    return region;
  }
}
export default Constellation;
