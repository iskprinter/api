import { Deal, Type } from "src/models";
import DealFinderStrategy from "./DealFinderStrategy";

export default class AnyMarketableType implements DealFinderStrategy {
  constructor(public types: Type[]) { }

  getDeals(): Deal[] {
    return this.types
      .filter((type) => type.market_group_id && type.name)
      .map((type) => ({ typeName: type.name })) as Deal[];
  }
}
