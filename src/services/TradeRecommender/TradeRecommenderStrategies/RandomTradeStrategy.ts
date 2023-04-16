import { RecommendedTradeData, OrderData, TypeData, MarketSummary } from "src/models";
import TradeRecommenderStrategy from "./TradeRecommenderStrategy";
import { TradeData } from "src/models";
import { BadRequestError } from "src/errors";

export default class RandomTradeStrategy implements TradeRecommenderStrategy {

  constructor(
    public marketTypes: TypeData[],
    public marketOrders: OrderData[],
  ) { }

  recommendTrade(characterId: number, budget: number, marketSummary: MarketSummary, priorTrades: TradeData[]): RecommendedTradeData {
    const selectedType = this._getRandomTypeWithinBudget(budget, marketSummary);
    const maxBuyPrice = marketSummary[selectedType.type_id]?.maxBuyPrice || 1;
    const buyVolume = Math.floor(budget / maxBuyPrice);
    const recommendedTrade = {
      characterId,
      action: {
        buyVolume,
        buyPrice: maxBuyPrice,
      },
      state: {
        budget,
        buyVolume: marketSummary[selectedType.type_id]?.buyVolume || 0,
        maxBuyPrice,
        minSellPrice: marketSummary[selectedType.type_id]?.minSellPrice || Infinity,
        sellVolume: marketSummary[selectedType.type_id]?.sellVolume || 0,
      },
      recommendedTradeId: 'placeholder',
      dateCreated: Date.now(),
      typeId: selectedType.type_id,
      typeName: String(this.marketTypes.find((t) => t.type_id === selectedType.type_id)?.name),
      status: 'Complete'
    };
    return recommendedTrade;
  }

  _getRandomTypeWithinBudget(budget: number, marketSummary: MarketSummary) {
    if (budget <= 1) {
      throw new BadRequestError("Your character's budget is less than 1");
    }

    const typeIsWithinBudget = (budget: number, type: TypeData): boolean => {
      const maxBuyPrice = marketSummary[type.type_id]?.maxBuyPrice || 1;
      const buyVolume = Math.floor(budget / maxBuyPrice);
      return buyVolume > 0;
    }

    let selectedType: TypeData;
    do {
      selectedType = this.marketTypes[Math.floor(Math.random() * this.marketTypes.length)];
    } while (!typeIsWithinBudget(budget, selectedType));
    return selectedType;
  }

}
