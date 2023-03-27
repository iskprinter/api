import TokenData from './TokenData';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface Token extends TokenData { }
class Token implements TokenData {
  constructor(tokenData: TokenData) {
    Object.assign(this, tokenData);
  }
}
export default Token;
