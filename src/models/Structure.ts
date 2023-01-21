import { DataProxy } from "src/services";
import Model from "./Model";
import Region from "./Region";
import StructureData from "./StructureData";

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface Structure extends StructureData { }
class Structure extends Model implements StructureData {
  constructor(dataProxy: DataProxy, structureData: StructureData) {
    super(dataProxy);
    Object.assign(this, structureData);
  }

  async getRegion(): Promise<Region> {
    const constellation = (await this._dataProxy.getConstellations({ systems: this.solar_system_id }))[0]
    const region = await constellation.getRegion();
    return region;
  }
}
export default Structure;
