import { Character, Deal, OrderData, TypeData } from "src/models";
import DealFinderStrategy from "./DealFinderStrategy";
import log from "src/tools/Logger";
import DataProxy from "../DataProxy";
import DealData from "src/models/DealData";

export default class InventoryTimesMarginStrategy implements DealFinderStrategy {
  constructor(
    public character: Character,
    public dataProxy: DataProxy,
    public types: TypeData[],
    public orders: OrderData[]
  ) { }

  getDeals(): Deal[] {

    log.info('Computing deals...');
    const typeNames = this.types
      .filter((type) => !type.name?.match(/Blueprint/))
      .reduce((typeNames: { [key: number]: string }, type) => ({ ...typeNames, [type.type_id]: String(type.name) }), {});

    const dealDataByTypeId: { [key: number]: DealData } = {};
    for (const order of this.orders) {
      if (!typeNames[order.type_id]) {
        continue;
      }
      const existingDeal = dealDataByTypeId[order.type_id];
      const buyPrice = order.is_buy_order === true ? order.price : 0;
      const sellPrice = order.is_buy_order === false ? order.price : Infinity;
      const volume = order.is_buy_order === false ? order.volume_remain * 0.05 : 0;
      if (!existingDeal) {
        dealDataByTypeId[order.type_id] = {
          buyPrice,
          feesPerUnit: order.is_buy_order === false ? this._computeFees(sellPrice) : Infinity,
          sellPrice,
          typeName: typeNames[order.type_id],
          volume: order.volume_remain * 0.05,
        };
      } else {
        const minSellPrice = Math.min(existingDeal.sellPrice, sellPrice);
        const maxBuyPrice = Math.max(existingDeal.buyPrice, buyPrice);
        dealDataByTypeId[order.type_id] = {
          buyPrice: maxBuyPrice,
          feesPerUnit: this._computeFees(minSellPrice),
          sellPrice: minSellPrice,
          typeName: existingDeal.typeName,
          volume: existingDeal.volume + volume,
        };
      }
    }
    const deals = Object.values(dealDataByTypeId)
      .filter((dealData) => dealData.sellPrice !== Infinity)
      .map((dealData) => new Deal(this.dataProxy, dealData))
      .sort((d1, d2) => d2.profit - d1.profit);
    return deals;
  }

  _computeFees(sellPrice: number): number {
    const accountingLevel = this.character.skills?.skills.find((skill) => skill.skill_id === 16622)?.active_skill_level || 0;
    const brokerRelationsLevel = this.character.skills?.skills.find((skill) => skill.skill_id === 3446)?.active_skill_level || 0;
    const salesTax = sellPrice * 0.08 * (1 - 0.11 * accountingLevel);
    const brokerFees = sellPrice * 0.01;  // TODO
    return salesTax + brokerFees;
  }
}
