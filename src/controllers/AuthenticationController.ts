import { RequestHandler, Request, Response } from 'express';
import env from 'env-var';
import { Database } from 'src/databases/Database';
import { AccessToken } from 'src/models/AccessToken'
import { Token } from 'src/models/Token'
import { TokenFactory } from 'src/models/TokenFactory'
import { TokenPostRequest, TokenVerificationResponse } from 'src/models/TokenRequests'
import { RequestValidator, RequiredParams } from 'src/tools/RequestValidator';

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

  getLoginUrl(): RequestHandler {
    return async (req: Request, res: Response) => {
      const requiredParams: RequiredParams = {
        body: [],
        query: ['callback-url']
      };

      (new RequestValidator(requiredParams)).validate(req);

      const responseType = 'code';
      const scopes = [
        'esi-assets.read_assets.v1',
        'esi-characterstats.read.v1',
        'esi-clones.read_clones.v1',
        'esi-location.read_location.v1',
        'esi-markets.read_character_orders.v1',
        'esi-markets.structure_markets.v1',
        'esi-skills.read_skills.v1',
        'esi-universe.read_structures.v1',
        'esi-wallet.read_character_wallet.v1'
      ];
      const loginUrl = new URL(
        `/v2/oauth/authorize`,
        `https://${AuthenticationController.LOGIN_SERVER_DOMAIN_NAME}/`
      );
      loginUrl.search = new URLSearchParams({
        response_type: responseType,
        redirect_uri: String(req.query['callback-url']),
        client_id: String(env.get('CLIENT_ID').required().asString()),
        scope: scopes.join(' '),
        state: String(req.body?.state),
      }).toString()
      res.json(loginUrl.toString());
    };
  }

}

export default AuthenticationController;
