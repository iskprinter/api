import { Deal, Type } from "src/models";
import DealFinderStrategy from "./DealFinderStrategy";

export default class AnyMarketableType implements DealFinderStrategy {
  constructor(public marketTypes: Type[]) { }

  getDeals(): Deal[] {
    return this.marketTypes
      .map((marketType) => ({ typeName: marketType.name }))
      .sort((d1, d2) => d1.typeName?.localeCompare(d2.typeName || '') || 0) as Deal[];
  }
}
