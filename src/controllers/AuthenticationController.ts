import { AccessToken } from 'src/models/AccessToken'
import { Token } from 'src/models/Token'
import { TokenFactory } from 'src/models/TokenFactory'
import { TokenPostRequest, TokenVerificationResponse } from 'src/models/TokenRequests'

class AuthenticationController {

  async getToken (tokenRequest: TokenPostRequest): Promise<Token> {
    const tf = new TokenFactory();
    return tf.createToken(tokenRequest);
  }

  async verifyToken (accessTokenString: string): Promise<TokenVerificationResponse> {
    const accessToken = new AccessToken(accessTokenString);
    return accessToken.verify();
  }

}

export default new AuthenticationController();
