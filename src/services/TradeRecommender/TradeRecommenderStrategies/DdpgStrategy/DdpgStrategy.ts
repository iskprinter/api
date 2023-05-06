import { MarketSummary, TradeData, RecommendedTradeData } from "src/models";
import TradeRecommenderStrategy from "../TradeRecommenderStrategy";

export default class DdpgStrategy implements TradeRecommenderStrategy {
  recommendTrade(characterId: number, budget: number, marketSummary: MarketSummary, priorTrades: TradeData[]): RecommendedTradeData {
    throw new Error("Method not implemented.");
  }
}
