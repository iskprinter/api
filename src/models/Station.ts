import { DataProxy } from "src/services";
import Model from "./Model";
import Region from "./Region";
import StationData from "./StationData";

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface Station extends StationData { }
class Station extends Model implements StationData {
  constructor(dataProxy: DataProxy, stationData: StationData) {
    super(dataProxy);
    Object.assign(this, stationData);
  }

  async getRegion(): Promise<Region> {
    const constellation = (await this._dataProxy.getConstellations({ systems: this.system_id }))[0]
    const region = await constellation.getRegion();
    return region;
  }
}
export default Station;
