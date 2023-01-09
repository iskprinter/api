import requester from 'src/tools/Requester';
import env from 'env-var';

import {
  ResourceNotFoundError,
  UnauthorizedError,
} from 'src/errors'
import { Token } from 'src/models'
import log from 'src/tools/Logger';
import { Request, Response, NextFunction } from 'express';
import ForbiddenError from 'src/errors/ForbiddenError';

export default class AuthService {

  basicAuthHeader(): string {
    const clientId = env.get('CLIENT_ID').required().asString();
    const clientSecret = env.get('CLIENT_SECRET').required().asString();
    const basicAuth = `${clientId}:${clientSecret}`;
    const encodedBasicAuth = Buffer.from(basicAuth).toString('base64');
    const basicAuthHeader = `Basic ${encodedBasicAuth}`;
    return basicAuthHeader;
  }

  async createTokenFromAuthorizationCode(code: string): Promise<Token> {
    try {
      const config = {
        headers: {
          'Authorization': this.basicAuthHeader(),
          'Content-Type': 'application/x-www-form-urlencoded',
          'Host': 'login.eveonline.com'
        }
      };
      const body = new URLSearchParams({
        grant_type: 'authorization_code',
        code
      });
      const eveResponse = await requester.post('https://login.eveonline.com/v2/oauth/token', body.toString(), config);
      const {
        access_token: accessToken,
        refresh_token: refreshToken
      } = eveResponse.data;
      const token = new Token(accessToken, refreshToken)
      log.info(`Generated new access/refresh token pair ${JSON.stringify(token)}.`);
      await token.save();
      return token;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      if (err.response.status === 401) {
        throw new UnauthorizedError()
      }
      log.error(err);
      throw err;
    }
  }

  async createTokenFromPriorAccessToken(priorToken: Token): Promise<Token> {

    // Send it to Eve for refreshing.
    const config = {
      headers: {
        'Authorization': this.basicAuthHeader(),
        'Content-Type': 'application/x-www-form-urlencoded',
        'Host': 'login.eveonline.com'
      }
    }
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: priorToken.refreshToken
    });

    let eveResponse
    try {
      eveResponse = await requester.post('https://login.eveonline.com/v2/oauth/token', body.toString(), config)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      if (err.response.status === 400 && err.response.data.error === 'invalid_grant') {
        log.error(err);
        throw new ResourceNotFoundError('The Eve API rejected the refresh token.')
      }
      throw err
    }
    const {
      access_token: accessToken,
      refresh_token: refreshToken
    } = eveResponse.data;

    // Save the new accessToken:refreshToken pair.
    const token = new Token(accessToken, refreshToken)
    return token.save()
  }

  validateAuth() {
    return async (req: Request, res: Response, next: NextFunction) => {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return next(new UnauthorizedError('No authorization header is present'));
      }
      const authHeaderRegex = /^Bearer [\w-]+.[\w-]+.[\w-]+$/;
      if (!authHeader.match(authHeaderRegex)) {
        return next(new UnauthorizedError(`Auth header does not match pattern ${authHeaderRegex}.`));
      }
      const payloadBase64Url = (authHeader.match(/^Bearer [\w-]+.([\w-]+).[\w-]+$/) as RegExpMatchArray)[1];
      const payloadBase64 = payloadBase64Url.replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(Buffer.from(payloadBase64, 'base64').toString());
      if (!payload.exp || payload.exp * 1000 < Date.now()) {
        return next(new ForbiddenError('The authorization token has expired.'));
      }
      next();
    };
  }
}
