import jwt from 'jsonwebtoken';
import * as fs from 'fs/promises';

import requester from 'src/tools/Requester';
import env from 'env-var';

import {
  BadRequestError,
  UnauthorizedError,
} from 'src/errors'
import { Token, TokenData } from 'src/models'
import log from 'src/tools/Logger';
import ForbiddenError from 'src/errors/ForbiddenError';
import { AxiosError, AxiosResponse } from 'axios';
import { Collection } from 'src/databases';

export default class AuthService {

  constructor(
    public tokensCollection: Collection<Token>
  ) { }

  basicAuthHeader(): string {
    const clientId = env.get('CLIENT_ID').required().asString();
    const clientSecret = env.get('CLIENT_SECRET').required().asString();
    const basicAuth = `${clientId}:${clientSecret}`;
    const encodedBasicAuth = Buffer.from(basicAuth).toString('base64');
    const basicAuthHeader = `Basic ${encodedBasicAuth}`;
    return basicAuthHeader;
  }

  async createTokenFromAuthorizationCode(code: string): Promise<Token> {
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
    const eveResponse = await (async () => {
      try {
        return await requester.post('https://login.eveonline.com/v2/oauth/token', body.toString(), config);
      } catch (err) {
        if (err instanceof AxiosError) {
          if (err.response?.status === 401) {
            throw new UnauthorizedError()
          }
        }
        log.error(err);
        throw err;
      }
    })()
    const {
      access_token: eveAccessToken,
      refresh_token: eveRefreshToken
    } = eveResponse.data;
    const payload = this.decodeJwtPayload(eveAccessToken);
    const characterId = payload.sub.match(/CHARACTER:EVE:(?<characterId>\d+)/).groups.characterId;

    const iskprinterTokenPayload = {
      characterId,
      characterName: payload.name
    };
    const iskprinterAccessToken = await this.createAccessToken(iskprinterTokenPayload);
    const iskprinterRefreshToken = await this.createRefreshToken(iskprinterTokenPayload);
    const token = new Token({
      iskprinterAccessToken,
      iskprinterRefreshToken,
      eveAccessToken,
      eveRefreshToken,
    });
    await this.tokensCollection.insertOne(token)
    return token;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  decodeJwtPayload(jwt: string): any {
    return JSON.parse(Buffer.from(
      jwt
        .split('.')[1]
        .replace(/-/g, '+')
        .replace(/_/g, '/'),
      'base64'
    ).toString());
  }

  async deleteTokens(tokens: Partial<TokenData>): Promise<void> {
    await this.tokensCollection.delete(tokens);
  }

  async refreshEveTokens(eveRefreshToken: string): Promise<Token> {
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
      refresh_token: eveRefreshToken
    });
    const eveResponse = await (async () => {
      try {
        return await requester.post('https://login.eveonline.com/v2/oauth/token', body.toString(), config)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err) {
        if (err instanceof AxiosError) {
          if (err.response?.status === 400 && err.response.data.error === 'invalid_grant') {
            log.error(err);
            throw new ForbiddenError('The Eve API rejected the refresh token.')
          }
        }
        throw err
      }
    })();
    const {
      access_token: newEveAccessToken,
      refresh_token: newEveRefreshToken
    } = eveResponse.data;
    return await this.tokensCollection.updateOne({ eveRefreshToken }, {
      eveAccessToken: newEveAccessToken,
      eveRefreshToken: newEveRefreshToken
    });
  }

  async refreshIskprinterTokens(iskprinterRefreshToken: string): Promise<Token> {
    const iskprinterRefreshTokenPayload = this.decodeJwtPayload(iskprinterRefreshToken);
    const priorToken = await this.tokensCollection.findOne({ iskprinterRefreshToken });
    if (!priorToken) {
      throw new ForbiddenError(`No such refresh token was found.`);
    }
    const newIskprinterAccessToken = await this.createAccessToken(iskprinterRefreshTokenPayload);
    const newIskprinterRefreshToken = await this.createAccessToken(iskprinterRefreshTokenPayload);
    const newToken = new Token({
      ...priorToken,
      iskprinterAccessToken: newIskprinterAccessToken,
      iskprinterRefreshToken: newIskprinterRefreshToken,
    });
    await this.tokensCollection.updateOne({ eveRefreshToken: newToken.eveRefreshToken }, newToken);
    return newToken;
  }

  async createAccessToken(payload: object) {
    return this.createJwt({
      ...payload,
      exp: Math.floor((new Date()).setTime(Date.now() + 20 * 60 * 1000) / 1000), // 20 minute expiration
      time: Math.floor(Date.now() / 1000),
    });
  }

  async createJwt(payload: object) {
    const jwtPrivateKeyPath = env.get('JWT_PRIVATE_KEY_PATH').required().asString();
    const jwtPrivateKey = (await fs.readFile(jwtPrivateKeyPath)).toString();
    return jwt.sign(payload, jwtPrivateKey, { algorithm: 'ES512' });
  }

  async createRefreshToken(payload: object) {
    return this.createJwt({
      ...payload,
      exp: Math.floor((new Date()).setTime(Date.now() + 20 * 24 * 60 * 60 * 1000) / 1000), // 20 days expiration
      time: Math.floor(Date.now() / 1000),
    });
  }

  getCharacterIdFromAuthHeader(authHeader?: string): number {
    const iskprinterAccessToken = this.getTokenFromAuthorizationHeader(authHeader);
    const payload = this.decodeJwtPayload(iskprinterAccessToken);
    const characterId = Number(payload.characterId);
    return characterId;
  }

  async getTokens(partialToken: Partial<Token>): Promise<Token> {
    return await this.tokensCollection.findOne(partialToken);
  }

  getTokenFromAuthorizationHeader(authorization?: string): string {
    if (!authorization) {
      throw new UnauthorizedError('Authorization header is not present.');
    }
    const regexMatches = authorization.match(/^Bearer (?<token>.*)$/);
    if (!regexMatches) {
      throw new UnauthorizedError(`Authorization header does not match regex '/^Bearer (.*)$/'`);
    }
    const regexGroupsCaptured = regexMatches.groups;
    if (!regexGroupsCaptured) {
      throw new UnauthorizedError(`Authorization header does not match regex '/^Bearer (.*)$/'`);
    }
    const token = regexGroupsCaptured.token;
    return token;
  }

  tokenIsExpired(token: string, bufferMs?: number): boolean {
    const payload = this.decodeJwtPayload(token);
    if (!payload.exp || (payload.exp < Math.floor((Date.now() + (bufferMs || 0)) / 1000))) {
      return true;
    }
    return false;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async verifyIskprinterJwt(iskprinterToken: string): Promise<any> {
    if (this.tokenIsExpired(iskprinterToken)) {
      throw new ForbiddenError('The JWT has expired.');
    }
    const jwtPublicKeyPath = env.get('JWT_PUBLIC_KEY_PATH').required().asString();
    const jwtPublicKey = (await fs.readFile(jwtPublicKeyPath)).toString();
    let payload;
    try {
      payload = jwt.verify(iskprinterToken, jwtPublicKey);
    } catch (err) {
      throw new ForbiddenError(`JWT verification did not pass.`);
    }
    return payload;
  }

  async withEveReauth<T>(authHeader: string, request: (eveAccessToken: string) => Promise<T>): Promise<T> {
    const iskprinterAccessToken = this.getTokenFromAuthorizationHeader(authHeader);
    let tokens = await this.getTokens({ iskprinterAccessToken });
    log.info(`getTokens retrieved these tokens: ${JSON.stringify(tokens)}`);
    const bufferMs = 1000 * 60 * 1; // 1 minute
    if (this.tokenIsExpired(tokens.eveAccessToken, bufferMs)) {
      tokens = await this.refreshEveTokens(tokens.eveRefreshToken);
      log.info(`refreshEveTokens retrieved these tokens: ${JSON.stringify(tokens)}`);
    }
    try {
      return await request(tokens.eveAccessToken);
    } catch (err) {
      if (err instanceof AxiosError) {
        if (!err.response) {
          throw err;
        }
        if (err.response.status === 403) {
          throw new ForbiddenError();
        }
      }
      throw err;
    }
  }

  async validateAuth(authHeader?: string) {
    if (!authHeader) {
      throw new UnauthorizedError('No authorization header is present');
    }
    const authHeaderRegex = /^Bearer [\w-]+.[\w-]+.[\w-]+$/;
    if (!authHeader.match(authHeaderRegex)) {
      throw new UnauthorizedError(`Auth header does not match pattern ${authHeaderRegex}.`);
    }
    const token = (authHeader.match(/^Bearer (?<token>[\w-]+.[\w-]+.[\w-]+)$/) as RegExpMatchArray)[1];
    return this.verifyIskprinterJwt(token);
  }
}
