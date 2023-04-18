import crypto from 'crypto';

import { MarketSummary, OrderData, RecommendedTradeData, TradeData, TransactionData } from "src/models";
import { TradeRecommenderStrategy } from "./TradeRecommenderStrategies";
import { Collection } from "src/databases";
import log from 'src/tools/log';

export default class TradeRecommender {
  constructor(
    public recommendedTradesCollection: Collection<RecommendedTradeData>,
    public transactionsCollection: Collection<TransactionData>,
  ) { }

  async createRecommendedTrade(characterId: number): Promise<RecommendedTradeData> {
    const recommendedTradeId = crypto.randomUUID()
    const recommendedTrade = await this.recommendedTradesCollection.insertOne({
      characterId,
      recommendedTradeId,
      dateCreated: Date.now(),
      status: 'ID created',
    });
    return recommendedTrade;
  }

  async getRecommendedTrade(characterId: number, recommendedTradeId: string): Promise<RecommendedTradeData> {
    return this.recommendedTradesCollection.findOne({
      characterId, 
      recommendedTradeId
    });
  }

  async getRecommendedTrades(characterId: number): Promise<RecommendedTradeData[]> {
    return this.recommendedTradesCollection.find({
      characterId, 
    });
  }

  async recommendTrade(characterId: number, budget: number, marketOrders: OrderData[], strategy: TradeRecommenderStrategy): Promise<RecommendedTradeData> {
    const pastTrades = await this.getPastTrades(characterId);
    log.info(JSON.stringify(pastTrades));
    const marketSummary = this._getMarketSummary(marketOrders);
    const recommendedTrade = strategy.recommendTrade(characterId, budget, marketSummary, pastTrades);
    return recommendedTrade;
  }

  async updateRecommendedTrade(query: object, recommendedTrade: Partial<RecommendedTradeData>): Promise<RecommendedTradeData> {
    return this.recommendedTradesCollection.updateOne(query, recommendedTrade);
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

  _getMarketSummary(marketOrders: OrderData[]): MarketSummary {
    const marketSummary: MarketSummary = {};
    for (const order of marketOrders) {
      if (!marketSummary[order.type_id]) {
        marketSummary[order.type_id] = {
          buyVolume: order.is_buy_order ? order.volume_remain : 0,
          maxBuyPrice: order.is_buy_order ? order.price : undefined,
          minSellPrice: order.is_buy_order ? undefined : order.price,
          sellVolume: order.is_buy_order ? 0 : order.volume_remain,
        }
      } else {
        marketSummary[order.type_id] = {
          buyVolume: marketSummary[order.type_id].buyVolume + (order.is_buy_order ? order.volume_remain : 0),
          minSellPrice: order.is_buy_order ? marketSummary[order.type_id].minSellPrice : Math.min(order.price, (marketSummary[order.type_id].minSellPrice || Infinity)),
          maxBuyPrice: order.is_buy_order ? Math.max(order.price, (marketSummary[order.type_id].maxBuyPrice || 0)) : marketSummary[order.type_id].maxBuyPrice,
          sellVolume: marketSummary[order.type_id].sellVolume + (order.is_buy_order ? 0 : order.volume_remain),
        }
      }
    }
    return marketSummary;
  }
}
