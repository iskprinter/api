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

  createTokens(): RequestHandler {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { proof, proofType } = req.body;
        const token = await (async () => {
          switch (proofType) {
            case 'authorizationCode': {
              const authorizationCode = proof;
              return await this.authService.createTokenFromAuthorizationCode(authorizationCode);
            }
            case 'refreshToken': {
              const refreshToken = proof;
              return await this.authService.refreshIskprinterTokens(refreshToken);
            }
            default:
              throw new BadRequestError("Expected 'grantType' to be either 'authorizationCode' or 'priorAccessToken'.");
          }
        })();
        return res.json({
          accessToken: token.iskprinterAccessToken,
          refreshToken: token.iskprinterRefreshToken
        })
      } catch (err) {
        return next(err);
      }
    }
  }

  deleteTokens(): RequestHandler {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const iskprinterAccessToken = this.authService.getTokenFromAuthorizationHeader(req.headers.authorization);
        await this.authService.deleteTokens({ iskprinterAccessToken });
        res.sendStatus(204);
      } catch (err) {
        return next(err);
      }
    };
  }

  validateAuth(): RequestHandler {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const authHeader = req.headers.authorization;
        const jwtPayload = await this.authService.validateAuth(authHeader);
        if (req.params.characterId && jwtPayload.characterId != Number(req.params.characterId)) {
          return next(new ForbiddenError(`JWT does not belong to the character being requested.`));
        }
      } catch (err) {
        return next(err);
      }
      next();
    }
  }
}

export default AuthController;
