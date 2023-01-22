import ModelData from "./ModelData";

export default interface TypeData extends ModelData {
  type_id: number;
  market_group_id?: number;
  name?: string;
}
