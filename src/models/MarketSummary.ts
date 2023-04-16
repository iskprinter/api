export default interface MarketSummary {
  [typeId: number]: {
    minSellPrice?: number;
    maxBuyPrice?: number;
    buyVolume: number;
    sellVolume: number;
  }
}
