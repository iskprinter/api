import { DataProxy } from "src/services";
import DealData from "./DealData";
import Model from "./Model";

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface Deal extends DealData { }
class Deal extends Model implements DealData {
  constructor(dataProxy: DataProxy, dealData: DealData) {
    super(dataProxy);
    Object.assign(this, dealData);
  }

  get profit(): number {
    return this.volume * (this.sellPrice - this.buyPrice - this.feesPerUnit);
  }
}
export default Deal;
