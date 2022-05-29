import { AccessToken } from 'src/entities/AccessToken'
import { Token } from 'src/entities/Token'
import { TokenFactory } from 'src/entities/TokenFactory'
import { TokenPostRequest, TokenVerificationResponse } from 'src/entities/TokenRequests'

class AuthenticationController {

  async getToken (tokenRequest: TokenPostRequest): Promise<Token> {
    const tf = new TokenFactory();
    return tf.createToken(tokenRequest);
  }

  async verifyToken (accessTokenString: string): Promise<TokenVerificationResponse> {
    const accessToken = new AccessToken(accessTokenString);
    return accessToken.verify();
  }

};

export default new AuthenticationController();
