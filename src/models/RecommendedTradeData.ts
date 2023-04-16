export default interface RecommendedTradeData {
  action?: {
    buyVolume: number;
    buyPrice: number;
  };
  characterId: number;
  recommendedTradeId: string;
  state?: {
    budget: number;
    buyVolume: number;
    maxBuyPrice?: number;
    minSellPrice?: number;
    sellVolume: number;
  };
  nextState?: {
    budget: number;
    buyVolume: number;
    maxBuyPrice?: number;
    minSellPrice?: number;
    sellVolume: number;
  };
  reward?: number;
  status: string;
  dateCreated: number;
  typeId?: number;
  typeName?: string;
}
