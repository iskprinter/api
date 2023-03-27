import jwt from 'jsonwebtoken';
import * as fs from 'fs/promises';

import requester from 'src/tools/Requester';
import env from 'env-var';

import {
  BadRequestError,
  UnauthorizedError,
} from 'src/errors'
import { Token } from 'src/models'
import log from 'src/tools/Logger';
import ForbiddenError from 'src/errors/ForbiddenError';
import { AxiosError } from 'axios';
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
    return this.tokensCollection.updateOne({ eveRefreshToken }, {
      eveAccessToken: newEveAccessToken,
      eveRefreshToken: newEveRefreshToken
    });
  }

  async refreshIskprinterTokens(iskprinterRefreshToken: string): Promise<Token> {
    const iskprinterRefreshTokenPayload = await this.verifyJwt(iskprinterRefreshToken);
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
      exp: (new Date()).setTime(Date.now() + 20 * 60 * 1000), // 20 minute expiration
      time: Date.now(),
    });
  }

  async createJwt(payload: object) {
    const jwtKeyPath = env.get('JWT_KEY_PATH').required().asString();
    const jwtKey = (await fs.readFile(jwtKeyPath)).toString();
    return jwt.sign(payload, jwtKey, { algorithm: 'ES512' });
  }

  async createRefreshToken(payload: object) {
    return this.createJwt({
      ...payload,
      exp: (new Date()).setTime(Date.now() + 20 * 24 * 60 * 60 * 1000), // 20 days expiration
      time: Date.now(),
    });
  }

  async getTokens(partialToken: { iskprinterAccessToken?: string, iskprinterRefreshToken?: string, eveAccessToken?: string, eveRefreshToken?: string }): Promise<Token> {
    return this.tokensCollection.findOne(partialToken);
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

  async getEveTokens(iskprinterAccessToken: string): Promise<{ eveAccessToken: string, eveRefreshToken: string }> {
    const token = await this.tokensCollection.findOne({ iskprinterAccessToken });
    return {
      eveAccessToken: token.eveAccessToken,
      eveRefreshToken: token.eveRefreshToken
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async verifyJwt(iskprinterToken: string): Promise<any> {
    const jwtKeyPath = env.get('JWT_KEY_PATH').required().asString();
    const jwtKey = (await fs.readFile(jwtKeyPath)).toString();
    const payload = (() => {
      try {
        return jwt.verify(iskprinterToken, jwtKey);
      } catch (err) {
        throw new ForbiddenError(`JWT verification did not pass.`);
      }
    })();
    if (typeof payload == 'string') {
      throw new BadRequestError('The JWT payload was not a serialized object');
    }
    if (!payload.exp || payload.exp < Date.now()) {
      throw new ForbiddenError('The JWT has expired.');
    }
    return payload;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  decodeJwtPayload(jwt: string): any {
    return JSON.parse(Buffer.from(
      jwt
        .split('.')[1]
        .replace(/\+/g, '-')
        .replace(/\//g, '_'),
      'base64'
    ).toString())
  }

  getCharacterIdFromAuthorization(auth: string): number {
    const token = this.getTokenFromAuthorizationHeader(auth);
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = JSON.parse(Buffer.from(base64, 'base64').toString());
    const characterId = Number(jsonPayload.sub.match(/CHARACTER:EVE:(?<id>\d+)/).groups.id);
    return characterId;
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
    return this.verifyJwt(token);
  }
}
