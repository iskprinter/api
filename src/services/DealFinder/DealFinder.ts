import { Deal } from "src/models";
import DealFinderStrategy from "./DealFinderStrategy";

export default class DealFinder {
  constructor(public strategy: DealFinderStrategy) { }

  getDeals(): Deal[] {
    return this.strategy.getDeals();
  }
}
