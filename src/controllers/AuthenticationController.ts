import { Collection } from 'src/databases';
import {
  AccessToken,
  Token,
  TokenFactory,
  TokenPostRequest,
  TokenVerificationResponse
} from 'src/models'

class AuthenticationController {

  static LOGIN_SERVER_DOMAIN_NAME = 'login.eveonline.com'
  tokensCollection: Collection<Token>;

  constructor(tokensCollection: Collection<Token>) {
    this.tokensCollection = tokensCollection;
  }

  async getToken(tokenRequest: TokenPostRequest): Promise<Token> {
    const tf = new TokenFactory();
    return tf.createToken(tokenRequest);
  }

  async verifyToken(accessTokenString: string): Promise<TokenVerificationResponse> {
    const accessToken = new AccessToken(accessTokenString);
    return accessToken.verify();
  }

}

export default AuthenticationController;
