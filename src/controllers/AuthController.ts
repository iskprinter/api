import { Request, RequestHandler, Response } from 'express';
import { Collection } from 'src/databases';
import { BadRequestError, ResourceNotFoundError } from 'src/errors';
import {
  AccessToken,
  Token,
  TokenPostRequest,
  TokenVerificationResponse
} from 'src/models'
import { AuthService } from 'src/services';
import log from 'src/tools/Logger';

class AuthController {
  static LOGIN_SERVER_DOMAIN_NAME = 'login.eveonline.com'
  constructor(
    public tokensCollection: Collection<Token>,
    public authService: AuthService
  ) { }

  getToken(): RequestHandler {
    return async (req: Request, res: Response) => {
      const tokenRequest: TokenPostRequest = req.body;
      log.info(`Creating token for tokenRequest ${JSON.stringify(tokenRequest)}...`);
      let token: Token;
      switch (tokenRequest.proofType) {
        case 'authorizationCode': {
          token = await this.authService.createTokenFromAuthorizationCode(tokenRequest.proof)
          break;
        }
        case 'priorAccessToken': {
          const priorAccessToken = tokenRequest.proof;
          const priorToken = await this.tokensCollection.findOne({ accessToken: priorAccessToken });
          if (!priorToken) {
            throw new ResourceNotFoundError(`Did not find a matching entry for access token ${priorAccessToken}.`)
          }
          token = await this.authService.createTokenFromPriorAccessToken(priorToken)
          // Clean up the old token
          await this.tokensCollection.deleteOne({ accessToken: priorAccessToken });
          break;
        }
        default:
          throw new BadRequestError("Expected 'grantType' to be either 'authorizationCode' or 'priorAccessToken'.")
      }

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

export default AuthController;
