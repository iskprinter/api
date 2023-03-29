import EveModelData from "./EveModelData";

export default interface TypeData extends EveModelData {
  capacity?: number;
  description: string;
  dogma_attributes?: [
    {
      attribute_id: number;
      value: number;
    }
  ];
  dogma_effects?: [
    {
      effect_id: number;
      is_default: boolean;
    }
  ];
  graphic_id?: number;
  group_id: number;
  icon_id?: number
  market_group_id?: number;
  mass?: number;
  name: string;
  packaged_volume?: number;
  portion_size?: number;
  published: boolean;
  radius?: number;
  type_id: number;
  volume?: number;
}
