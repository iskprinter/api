import { MarketSummary, RecommendedTradeData } from "src/models";
import TradeData from "src/models/TradeData";

export default interface TradeRecommenderStrategy {
  recommendTrade(characterId: number, budget: number, marketSummary: MarketSummary, priorTrades: TradeData[]): RecommendedTradeData;
}
