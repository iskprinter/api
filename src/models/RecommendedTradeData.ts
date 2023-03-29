export default interface RecommendedTradeData {
  characterId: number;
  timestamp: number;
  recommendedTradeId: string;
  typeId: number;
  typeName: string;
  action: {
    buyVolume: number;
  };
  state: {
    maxBuyPrice: number;
    buyVolume: number;
    minSellPrice: number;
    sellVolume: number;
  };
}
