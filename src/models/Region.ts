import { DataProxy } from "src/services";
import Model from "./Model";
import RegionData from "./RegionData";

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface Region extends RegionData { }
class Region extends Model implements RegionData {
  constructor(dataProxy: DataProxy, regionData: RegionData) {
    super(dataProxy);
    Object.assign(this, regionData);
  }
}
export default Region;
