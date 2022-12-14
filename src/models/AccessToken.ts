import axios from 'axios'
import { UnauthorizedError } from 'src/errors'
import { TokenVerificationResponse } from './TokenRequests'

export default class AccessToken {
  
  tokenString: string;

  constructor(tokenString: string) {
    this.tokenString = tokenString
  }

  async verify(): Promise<TokenVerificationResponse> {
    const config = {
      headers: {
        authorization: `Bearer ${this.tokenString}`
      }
    }
    let eveResponse;
    try {
      eveResponse = await axios.get<TokenVerificationResponse>('https://login.eveonline.com/oauth/verify', config);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      if (err.response.status === 401) {
        throw new UnauthorizedError();
      }
      throw err;
    }
    return eveResponse.data;
  }

}
