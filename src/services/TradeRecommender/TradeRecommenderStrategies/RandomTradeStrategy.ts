import { RecommendedTradeData, OrderData, TypeData } from "src/models";
import TradeRecommenderStrategy from "./TradeRecommenderStrategy";
import { TradeData } from "src/models";
import crypto from 'crypto';

interface MarketSummary {
  [typeId: number]: {
    minSellPrice: number;
    maxBuyPrice: number;
    buyVolume: number;
    sellVolume: number;
  }
}

export default class RandomTradeStrategy implements TradeRecommenderStrategy {

  constructor(
    public marketTypes: TypeData[],
    public marketOrders: OrderData[],
  ) { }

  recommendTrades(characterId: number, priorTrades: TradeData[]): RecommendedTradeData[] {
    const selectedTypes = [];
    for (let i = 0; i < 10; i += 1) {
      selectedTypes.push(this.marketTypes[Math.floor(Math.random() * this.marketTypes.length)]);
    }
    const marketSummary = this._getMarketSummary(this.marketOrders);
    const recommendedTrades: RecommendedTradeData[] = selectedTypes.map((type) => ({
      characterId,
      action: {
        buyVolume: 5,
      },
      state: {
        maxBuyPrice: marketSummary[type.type_id]?.maxBuyPrice || 0,
        buyVolume: marketSummary[type.type_id]?.buyVolume || 0,
        minSellPrice: marketSummary[type.type_id]?.minSellPrice || 0,
        sellVolume: marketSummary[type.type_id]?.sellVolume || 0,
      },
      recommendedTradeId: crypto.randomUUID(),
      timestamp: Date.now(),
      typeId: type.type_id,
      typeName: String(this.marketTypes.find((t) => t.type_id === type.type_id)?.name),
    }));
    return recommendedTrades;
  }
  
  _getMarketSummary(marketOrders: OrderData[]): MarketSummary {
    const marketSummary: MarketSummary = {};
    for (const order of marketOrders) {
      if (!marketSummary[order.type_id]) {
        marketSummary[order.type_id] = {
          buyVolume: order.is_buy_order ? order.volume_remain : 0,
          maxBuyPrice: order.is_buy_order ? order.price : 0,
          minSellPrice: order.is_buy_order ? 0 : order.price,
          sellVolume: order.is_buy_order ? 0 : order.volume_remain,
        }
      } else {
        marketSummary[order.type_id] = {
          buyVolume: marketSummary[order.type_id].buyVolume + (order.is_buy_order ? order.volume_remain : 0),
          minSellPrice: order.is_buy_order ? marketSummary[order.type_id].minSellPrice : Math.min(order.price, marketSummary[order.type_id].minSellPrice),
          maxBuyPrice: order.is_buy_order ? Math.max(order.price, marketSummary[order.type_id].maxBuyPrice) : marketSummary[order.type_id].maxBuyPrice,
          sellVolume: marketSummary[order.type_id].sellVolume + (order.is_buy_order ? 0 : order.volume_remain),
        }
      }
    }
    return marketSummary;
  }
}
