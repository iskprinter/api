import axios from 'axios'
import { UnauthorizedError } from 'src/errors'
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
    let eveResponse
    try {
      eveResponse = await axios.get<TokenVerificationResponse>('https://login.eveonline.com/oauth/verify', config)
    } catch (err: any) {
      if (err.response.status === 401) {
        throw new UnauthorizedError()
      }
      throw err
    }
    return eveResponse.data
  }

}
