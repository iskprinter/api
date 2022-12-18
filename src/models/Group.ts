export default interface Group {
  market_group_id: number;
  description?: string;
  name?: string;
  parent_group_id?: number;
  types?: Array<number>;
}
