import { Request, RequestHandler, Response } from 'express';
import { Collection } from 'src/databases';
import { BadRequestError } from 'src/errors';
import {
  AccessToken,
  Token,
  TokenFactory,
  TokenPostRequest,
  TokenVerificationResponse
} from 'src/models'
import { TokenService } from 'src/services';
import log from 'src/tools/Logger';

class AuthenticationController {

  static LOGIN_SERVER_DOMAIN_NAME = 'login.eveonline.com'
  tokensCollection: Collection<Token>;
  tokenService: TokenService;

  constructor(tokensCollection: Collection<Token>, tokenService: TokenService) {
    this.tokensCollection = tokensCollection;
    this.tokenService = tokenService;
  }

  getToken(): RequestHandler {
    return async (req: Request, res: Response) => {
      const tokenRequest: TokenPostRequest = req.body
      log.info(`Creating token for tokenRequest ${JSON.stringify(tokenRequest)}...`);
      const tf = new TokenFactory();
      const token: Token = await tf.createToken(tokenRequest);
      log.info(`Successfully created token for tokenRequest ${JSON.stringify(tokenRequest)}.`);
      return res.json(token.accessToken)
    }
  }

  verifyToken(): RequestHandler {
    return async (req: Request, res: Response) => {
      const authHeader = String(req.headers.authorization || req.headers.Authorization)
      if (authHeader === null) {
        throw new BadRequestError('Header \'authorization\' or \'Authorization\' is required.')
      }
      const regexMatches = authHeader.match(/^Bearer (.*)$/)
      if (regexMatches === null) {
        throw new BadRequestError('The authorization header must begin with "Bearer "');
      }
      const accessTokenString: string = regexMatches[1];
      const accessToken = new AccessToken(accessTokenString);

      const tvr: TokenVerificationResponse = await accessToken.verify();
      return res.json(tvr)
    }
  }

}

export default AuthenticationController;
