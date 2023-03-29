import RecommendedTradeData from "./RecommendedTradeData";

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface RecommendedTrade extends RecommendedTradeData { }
class RecommendedTrade implements RecommendedTradeData {
  constructor(recommendedTradeData: RecommendedTradeData) {
    Object.assign(this, recommendedTradeData);
  }

  get profit(): number {
    return this.action.buyVolume * (this.state.minSellPrice - this.state.maxBuyPrice);
  }
}
export default RecommendedTrade;
