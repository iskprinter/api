import ModelData from "./ModelData";

export default interface TokenData extends ModelData {
  accessToken: string;
  refreshToken: string;
}
