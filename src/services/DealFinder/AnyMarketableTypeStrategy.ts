import { Deal, Type } from "src/models";
import DealFinderStrategy from "./DealFinderStrategy";

export default class AnyMarketableType implements DealFinderStrategy {
  constructor(public marketTypes: Type[]) { }

  getDeals(): Deal[] {
    return this.marketTypes.map((marketType) => ({ typeName: marketType.name })) as Deal[];
  }
}
