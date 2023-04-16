import RecommendedTradeData from "./RecommendedTradeData";

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface RecommendedTrade extends RecommendedTradeData { }
class RecommendedTrade implements RecommendedTradeData {
  constructor(recommendedTradeData: RecommendedTradeData) {
    Object.assign(this, recommendedTradeData);
  }

  get profit(): number {
    if (!this.action || !this.state) {
      return 0;
    }
    return this.action?.buyVolume * ((this.state.minSellPrice || Infinity) - (this.state.maxBuyPrice || 0));
  }
}
export default RecommendedTrade;
