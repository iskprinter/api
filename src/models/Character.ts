import { DataProxy } from "src/services";
import CharacterData from "./CharacterData";
import Model from "./Model";

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface Character extends CharacterData { }
class Character extends Model implements CharacterData {
  constructor(dataProxy: DataProxy, characterData: CharacterData) {
    super(dataProxy);
    Object.assign(this, characterData);
  }
}
export default Character;
