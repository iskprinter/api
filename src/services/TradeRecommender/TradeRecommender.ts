import { RecommendedTradeData, TradeData, TransactionData } from "src/models";
import { TradeRecommenderStrategy } from "./TradeRecommenderStrategies";
import { Collection } from "src/databases";

export default class TradeRecommender {
  constructor(
    public recommendedTradesCollection: Collection<RecommendedTradeData>,
    public transactionsCollection: Collection<TransactionData>,
  ) { }

  async recommendTrades(characterId: number, strategy: TradeRecommenderStrategy): Promise<RecommendedTradeData[]> {
    const pastTrades = await this.getPastTrades(characterId);
    const recommendedTrades = strategy.recommendTrades(characterId, pastTrades);
    const trades = await this.recommendedTradesCollection.putMany(recommendedTrades);
    return trades;
  }

  async updateTransactions(characterId: number, recentTransactions: TransactionData[]): Promise<TransactionData[]> {
    return this.transactionsCollection.putMany(
      recentTransactions.map((transaction) => ({
        ...transaction,
        characterId,
      }))
    );
  }

  async getPastTrades(characterId: number): Promise<TradeData[]> {
    const tradesByType: {
      [typeId: number]: {
        typeId: number;
        averageBuyPrice: number;
        averageSellPrice: number;
        buyVolume: number;
        sellVolume: number;
      }
    } = {};

    const transactions = await this.transactionsCollection.find({ characterId });

    for (const transaction of transactions) {
      if (!tradesByType[transaction.type_id]) {
        tradesByType[transaction.type_id] = {
          typeId: transaction.type_id,
          averageBuyPrice: 0,
          averageSellPrice: 0,
          buyVolume: 0,
          sellVolume: 0,
        };
      }
      if (transaction.is_buy) {
        const buyPrice = transaction.unit_price;
        const buyVolume = transaction.quantity;
        const previousAverageBuyPrice = tradesByType[transaction.type_id].averageBuyPrice;
        const previousBuyVolume = tradesByType[transaction.type_id].buyVolume;
        tradesByType[transaction.type_id].averageBuyPrice = (previousAverageBuyPrice * previousBuyVolume + buyPrice * buyVolume) / (previousBuyVolume + buyVolume);
        tradesByType[transaction.type_id].buyVolume = previousBuyVolume + buyVolume;
      } else {
        const sellPrice = transaction.unit_price;
        const sellVolume = transaction.quantity;
        const previousAverageSellPrice = tradesByType[transaction.type_id].averageSellPrice;
        const previousSellVolume = tradesByType[transaction.type_id].sellVolume;
        tradesByType[transaction.type_id].averageSellPrice = (previousAverageSellPrice * previousSellVolume + sellPrice * sellVolume) / (previousSellVolume + sellVolume);
        tradesByType[transaction.type_id].sellVolume = previousSellVolume + sellVolume;
      }
    }
    const trades = Object.values(tradesByType)
      .map((trade) => ({
        typeId: trade.typeId,
        volume: Math.min(trade.buyVolume, trade.sellVolume),
        averageBuyPrice: trade.averageBuyPrice,
        averageSellPrice: trade.averageSellPrice,
      }))
      .filter((trade) => trade.volume > 0);
    return trades;

  }
}
