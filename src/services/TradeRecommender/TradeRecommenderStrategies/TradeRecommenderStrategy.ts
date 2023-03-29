import { RecommendedTradeData } from "src/models";
import TradeData from "src/models/TradeData";

export default interface TradeRecommenderStrategy {
  recommendTrades(characterId: number, priorTrades: TradeData[]): RecommendedTradeData[];
}
