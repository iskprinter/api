// import { Character, RecommendedTrade, OrderData, TypeData } from "src/models";
// import RecommendedTradeFinderStrategy from "./RecommendedTradeFinderStrategy";
// import log from "src/tools/Logger";
// import DataProxy from "../DataProxy";
// import RecommendedTradeData from "src/models/RecommendedTradeData";

// export default class InventoryTimesMarginStrategy implements RecommendedTradeFinderStrategy {
//   constructor(
//     public character: Character,
//     public dataProxy: DataProxy,
//     public types: TypeData[],
//     public orders: OrderData[]
//   ) { }

//   getRecommendedTrades(): RecommendedTrade[] {

//     log.info('Computing recommendedTrades...');
//     const typeNames = this.types
//       .filter((type) => !type.name?.match(/Blueprint/))
//       .reduce((typeNames: { [key: number]: string }, type) => ({ ...typeNames, [type.type_id]: String(type.name) }), {});

//     const recommendedTradeDataByTypeId: { [key: number]: RecommendedTradeData } = {};
//     for (const order of this.orders) {
//       if (!typeNames[order.type_id]) {
//         continue;
//       }
//       const existingRecommendedTrade = recommendedTradeDataByTypeId[order.type_id];
//       const buyPrice = order.is_buy_order === true ? order.price : 0;
//       const sellPrice = order.is_buy_order === false ? order.price : Infinity;
//       const volume = order.is_buy_order === false ? order.volume_remain * 0.05 : 0;
//       if (!existingRecommendedTrade) {
//         recommendedTradeDataByTypeId[order.type_id] = {
//           buyPrice,
//           feesPerUnit: order.is_buy_order === false ? this._computeFees(sellPrice) : Infinity,
//           sellPrice,
//           typeName: typeNames[order.type_id],
//           volume: order.volume_remain * 0.05,
//         };
//       } else {
//         const minSellPrice = Math.min(existingRecommendedTrade.sellPrice, sellPrice);
//         const maxBuyPrice = Math.max(existingRecommendedTrade.buyPrice, buyPrice);
//         recommendedTradeDataByTypeId[order.type_id] = {
//           buyPrice: maxBuyPrice,
//           feesPerUnit: this._computeFees(minSellPrice),
//           sellPrice: minSellPrice,
//           typeName: existingRecommendedTrade.typeName,
//           volume: existingRecommendedTrade.volume + volume,
//         };
//       }
//     }
//     const recommendedTrades = Object.values(recommendedTradeDataByTypeId)
//       .filter((recommendedTradeData) => recommendedTradeData.sellPrice !== Infinity)
//       .map((recommendedTradeData) => new RecommendedTrade(this.dataProxy, recommendedTradeData))
//       .sort((d1, d2) => d2.profit - d1.profit);
//     return recommendedTrades;
//   }

//   _computeFees(sellPrice: number): number {
//     const accountingLevel = this.character.skills?.skills.find((skill) => skill.skill_id === 16622)?.active_skill_level || 0;
//     const brokerRelationsLevel = this.character.skills?.skills.find((skill) => skill.skill_id === 3446)?.active_skill_level || 0;
//     const salesTax = sellPrice * 0.08 * (1 - 0.11 * accountingLevel);
//     const brokerFees = sellPrice * 0.01;  // TODO
//     return salesTax + brokerFees;
//   }
// }
