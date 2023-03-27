import EveModelData from "./EveModelData";

export default interface TokenData extends EveModelData {
  eveAccessToken: string;
  eveRefreshToken: string;
  iskprinterAccessToken: string;
  iskprinterRefreshToken: string;
}
