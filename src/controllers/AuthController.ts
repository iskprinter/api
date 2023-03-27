import { NextFunction, Request, RequestHandler, Response } from 'express';
import { Collection } from 'src/databases';
import { BadRequestError } from 'src/errors';
import ForbiddenError from 'src/errors/ForbiddenError';
import { Token } from 'src/models'
import { AuthService } from 'src/services';

class AuthController {
  static LOGIN_SERVER_DOMAIN_NAME = 'login.eveonline.com'
  constructor(
    public authService: AuthService,
    public tokensCollection: Collection<Token>,
  ) { }

  getToken(): RequestHandler {
    return async (req: Request, res: Response) => {
      const { proof, proofType } = req.body;
      const token = await (async () => {
        switch (proofType) {
          case 'authorizationCode': {
            const authorizationCode = proof;
            const token = await this.authService.createTokenFromAuthorizationCode(authorizationCode);
            return token;
          }
          case 'refreshToken': {
            const refreshToken = proof;
            const token = await this.authService.refreshIskprinterTokens(refreshToken);
            return token;
          }
          default:
            throw new BadRequestError("Expected 'grantType' to be either 'authorizationCode' or 'priorAccessToken'.");
        }
      })()
      return res.json({
        accessToken: token.iskprinterAccessToken,
        refreshToken: token.iskprinterRefreshToken
      })
    }
  }

  validateAuth(): RequestHandler {
    return async (req: Request, res: Response, next: NextFunction) => {
      const authHeader = req.headers.authorization;
      const jwtPayload = await (async () => {
        try {
          return await this.authService.validateAuth(authHeader);
        } catch (err) {
          next(err);
        }
      })();
      if (req.params.characterId && jwtPayload.characterId != Number(req.params.characterId)) {
        next(new ForbiddenError(`JWT does not belong to the character being requested.`));
      }
      next();
    }
  }
}

export default AuthController;
