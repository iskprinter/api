export default interface MarketGroupData {
  market_group_id: number;
  description: string;
  name: string;
  parent_group_id?: number;
  types: number[];
}
