import EveModelData from "./EveModelData";

export interface CharacterLocation {
  solar_system_id: number;
  station_id?: number;
  structure_id?: number;
}

export interface CharacterSkills {
  skills: {
    active_skill_level: number,
    skill_id: number,
    skillpoints_in_skill: number,
    trained_skill_level: number
  }[],
}

export default interface CharacterData extends EveModelData {
  character_id: number;
  location?: CharacterLocation;
  skills?: CharacterSkills;
}
