export default interface Group {
  description: string;
  market_group_id: number;
  name: string;
  parent_group_id: number;
  types: Array<number>;
}
