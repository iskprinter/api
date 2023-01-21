import { Character, Deal, Order, Type } from "src/models";
import DealFinderStrategy from "./DealFinderStrategy";
import log from "src/tools/Logger";

export default class InventoryTimesMarginStrategy implements DealFinderStrategy {
  constructor(
    public character: Character,
    public types: Type[],
    public orders: Order[]
  ) { }

  getDeals(): Deal[] {

    log.info('Computing deals...');
    const typeNames = this.types
      .filter((type) => !type.name?.match(/Blueprint/))
      .reduce((typeNames: { [key: number]: string }, type) => ({ ...typeNames, [type.type_id]: String(type.name) }), {});
    return Object.entries(typeNames)
      .map<Deal>(([typeId, typeName]) => this.orders
        .filter((order) => order.type_id === Number(typeId))
        .reduce((deal: Deal, order) => {
          const buyPrice = order.is_buy_order === true ? Math.max(deal.buyPrice, Number(order.price)) : deal.buyPrice;
          const sellPrice = order.is_buy_order === false ? Math.min(deal.sellPrice, Number(order.price)) : deal.sellPrice;
          return {
            typeName: deal.typeName,
            buyPrice,
            sellPrice,
            feesPerUnit: this._computeFees(buyPrice, sellPrice),
            volume: order.is_buy_order === false ? (deal.volume + 0.05 * order.volume_remain) : deal.volume,
          }
        }, {
          typeName: typeName,
          buyPrice: 0,
          sellPrice: Infinity,
          feesPerUnit: 0,
          volume: 0,
        })
      ).filter((deal) => deal.sellPrice !== Infinity)
      .sort((d1, d2) => (d2.volume * (d2.sellPrice - d2.buyPrice)) - (d1.volume * (d1.sellPrice - d1.buyPrice)));
  }

  _computeFees(buyPrice: number, sellPrice: number): number {
    const brokerRelationsLevel = this.character.skills?.skills.find((skill) => skill.skill_id === 3446)?.active_skill_level || 0;
    return 0;
  }
}
