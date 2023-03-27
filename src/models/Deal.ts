import { DataProxy } from "src/services";
import DealData from "./DealData";
import EveModel from "./EveModel";

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface Deal extends DealData { }
class Deal extends EveModel implements DealData {
  constructor(dataProxy: DataProxy, dealData: DealData) {
    super(dataProxy);
    Object.assign(this, dealData);
  }

  get profit(): number {
    return this.volume * (this.sellPrice - this.buyPrice - this.feesPerUnit);
  }
}
export default Deal;
