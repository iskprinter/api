import { DataProxy } from "src/services";
import ConstellationData from "./ConstellationData";
import Model from "./Model";
import Region from "./Region";

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface Constellation extends ConstellationData { }
class Constellation extends Model implements ConstellationData {
  constructor(dataProxy: DataProxy, constellationData: ConstellationData) {
    super(dataProxy);
    Object.assign(this, constellationData);
  }

  async getRegion(): Promise<Region> {
    const region = (await this._dataProxy.getRegions({ region_id: this.region_id }))[0];
    return region;
  }
}
export default Constellation;
