import axios from 'axios'
import { TokenVerificationResponse } from './TokenRequests'

export class AccessToken {
  tokenString: string;

  constructor (tokenString: string) {
    this.tokenString = tokenString
  }

  async verify (): Promise<TokenVerificationResponse> {
    const config = {
      headers: {
        authorization: `Bearer ${this.tokenString}`
      }
    }
    const eveResponse = await axios.get<TokenVerificationResponse>('https://login.eveonline.com/oauth/verify', config)
    return eveResponse.data
  }
}
