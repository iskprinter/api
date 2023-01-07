import { Deal } from "src/models";

export default interface DealFinderStrategy {
  getDeals(): Deal[];
}
