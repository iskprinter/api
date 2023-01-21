import ModelData from "./ModelData";

export interface Skills {
  skills: {
    active_skill_level: number,
    skill_id: number,
    skillpoints_in_skill: number,
    trained_skill_level: number
  }[],
}

export default interface CharacterData extends ModelData {
  character_id: number;
  skills?: Skills;
}
