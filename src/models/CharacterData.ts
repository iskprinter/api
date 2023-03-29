import EveModelData from "./EveModelData";

export interface CharacterSkills {
  skills: {
    active_skill_level: number,
    skill_id: number,
    skillpoints_in_skill: number,
    trained_skill_level: number
  }[],
  total_sp: number;
  unallocated_sp?: number;
}

export interface CharacterData extends EveModelData {
  alliance_id?: number;
  birthday: string;
  bloodline_id: number;
  character_id: number;
  corporation_id: number;
  description?: string;
  faction_id?: number;
  gender: string;
  name: string;
  race_id: number;
  security_status?: number;
  title?: string;
}
