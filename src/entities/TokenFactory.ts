import axios from 'axios'
import { Collection } from 'mongodb'
import { BadRequestError, ResourceNotFoundError, UnauthorizedError } from 'src/errors'
import { Token } from './Token'
import { TokenPostRequest } from './TokenRequests'

export class TokenFactory {
  private static basicAuthHeader (): { Authorization: string } {
    const basicAuth = `${process.env.CLIENT_ID}:${process.env.CLIENT_SECRET}`
    const encodedBasicAuth = Buffer.from(basicAuth).toString('base64')
    const basicAuthHeader = { Authorization: `Basic ${encodedBasicAuth}` }
    return basicAuthHeader
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
    const config = {
      headers: TokenFactory.basicAuthHeader()
    }
    const body = {
      grant_type: 'authorization_code',
      code
    }
    let eveResponse
    try {
      eveResponse = await axios.post('https://login.eveonline.com/oauth/token', body, config)
    } catch (err: any) {
      if (err.response.status === 401) {
        throw new UnauthorizedError()
      }
      throw err
    }
    const {
      access_token: accessToken,
      refresh_token: refreshToken
    }: any = eveResponse.data

    const token = new Token(accessToken, refreshToken)
    await token.save()
    return token
  }

  private async createTokenFromPriorAccessToken (priorAccessToken: string): Promise<Token> {
    // Retrieve the old accessToken:refreshToken pair.
    const priorToken = await Token.withCollection((collection: Collection<any>) => {
      return collection.findOne({ accessToken: priorAccessToken })
    })

    if (!priorToken) {
      throw new ResourceNotFoundError(`Did not find a matching entry for access token ${priorAccessToken}.`)
    }

    // Send it to Eve for refreshing.
    const config = {
      headers: TokenFactory.basicAuthHeader()
    }
    const body = {
      grant_type: 'refresh_token',
      refresh_token: priorToken.refreshToken
    }

    let eveResponse
    try {
      eveResponse = await axios.post('https://login.eveonline.com/v2/oauth/token', body, config)
    } catch (err: any) {
      if (err.response.status === 400 && err.response.data.error === 'invalid_grant') {
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
};
