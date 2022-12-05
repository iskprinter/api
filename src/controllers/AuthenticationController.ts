import { Database } from 'src/databases/Database';
import { AccessToken } from 'src/models/AccessToken'
import { Token } from 'src/models/Token'
import { TokenFactory } from 'src/models/TokenFactory'
import { TokenPostRequest, TokenVerificationResponse } from 'src/models/TokenRequests'

class AuthenticationController {

  static LOGIN_SERVER_DOMAIN_NAME = 'login.eveonline.com'
  database: Database;

  constructor(database: Database) {
    this.database = database;
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
