import EveModelData from "./EveModelData";

export default interface TypeData extends EveModelData {
  type_id: number;
  market_group_id?: number;
  name?: string;
}
