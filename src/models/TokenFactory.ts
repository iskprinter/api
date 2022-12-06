import axios from 'axios'
import env from 'env-var';
import { Collection } from 'mongodb'

import { BadRequestError, ResourceNotFoundError, UnauthorizedError } from 'src/errors'
import Token from './Token'
import { TokenPostRequest } from './TokenRequests'
import log from 'src/tools/Logger';

export default class TokenFactory {
  private static basicAuthHeader (): string {
    const clientId = env.get('CLIENT_ID').required().asString();
    const clientSecret = env.get('CLIENT_SECRET').required().asString();
    const basicAuth = `${clientId}:${clientSecret}`;
    const encodedBasicAuth = Buffer.from(basicAuth).toString('base64');
    const basicAuthHeader = `Basic ${encodedBasicAuth}`;
    return basicAuthHeader;
  }

  async createToken (tokenRequest: TokenPostRequest): Promise<Token> {
    switch (tokenRequest.proofType) {
      case 'authorizationCode':
        return this.createTokenFromAuthorizationCode(tokenRequest.proof)
      case 'priorAccessToken':
        return this.createTokenFromPriorAccessToken(tokenRequest.proof)
      default:
        throw new BadRequestError("Expected 'grantType' to be either 'authorizationCode' or 'priorAccessToken'.")
    }
  }

  private async createTokenFromAuthorizationCode (code: string): Promise<Token> {
    let eveResponse
    try {
      const config = {
        headers: {
          'Authorization': TokenFactory.basicAuthHeader(),
          'Content-Type': 'application/x-www-form-urlencoded',
          'Host': 'login.eveonline.com'
        }
      };
      const body = new URLSearchParams({
        grant_type: 'authorization_code',
        code
      });
      eveResponse = await axios.post('https://login.eveonline.com/v2/oauth/token', body.toString(), config)
    } catch (err: any) {
      if (err.response.status === 401) {
        throw new UnauthorizedError()
      }
      log.error(err);
      throw err;
    }
    const {
      access_token: accessToken,
      refresh_token: refreshToken
    }: any = eveResponse.data;

    const token = new Token(accessToken, refreshToken)
    log.info(`Generated new access/refresh token pair ${JSON.stringify(token)}.`);
    await token.save();
    return token;
  }

  private async createTokenFromPriorAccessToken (priorAccessToken: string): Promise<Token> {
    // Retrieve the old accessToken:refreshToken pair.
    const priorToken = await Token.withCollection((collection: Collection<any>) => {
      log.info(`Finding refresh token corresponding to access token ${priorAccessToken}...`);
      return collection.findOne({ accessToken: priorAccessToken })
    })

    if (!priorToken) {
      throw new ResourceNotFoundError(`Did not find a matching entry for access token ${priorAccessToken}.`)
    }

    // Send it to Eve for refreshing.
    const config = {
      headers: {
        'Authorization': TokenFactory.basicAuthHeader(),
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
      eveResponse = await axios.post('https://login.eveonline.com/v2/oauth/token', body.toString(), config)
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
    }: any = eveResponse.data

    // Save the new accessToken:refreshToken pair.
    const token = new Token(accessToken, refreshToken)
    await token.save()

    // Clean up the old token
    await Token.withCollection((collection: Collection<any>) => {
      return collection.deleteOne({ accessToken: priorAccessToken })
    })

    return token
  }
}
