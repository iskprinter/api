import { Collection } from 'src/databases';
import {
  AccessToken,
  Token,
  TokenFactory,
  TokenPostRequest,
  TokenVerificationResponse
} from 'src/models'
import { TokenService } from 'src/services';

class AuthenticationController {

  static LOGIN_SERVER_DOMAIN_NAME = 'login.eveonline.com'
  tokensCollection: Collection<Token>;
  tokenService: TokenService;

  constructor(tokensCollection: Collection<Token>, tokenService: TokenService) {
    this.tokensCollection = tokensCollection;
    this.tokenService = tokenService;
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
