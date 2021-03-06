import axios from "axios";
import { Collection } from "mongodb";
import { BadRequestError } from "src/errors/BadRequestError";
import { ResourceNotFoundError } from "src/errors/ResourceNotFoundError";
import { Token } from "./Token";
import { TokenRequest } from "./TokenRequest";

export class TokenFactory {

    private static basicAuthHeader(): {Authorization: string} {
        const basicAuth = `${process.env.CLIENT_ID}:${process.env.CLIENT_SECRET}`;
        const encodedBasicAuth = Buffer.from(basicAuth).toString('base64');
        const basicAuthHeader = { Authorization: `Basic ${encodedBasicAuth}` };
        return basicAuthHeader;
    }

    async createToken(tokenRequest: TokenRequest): Promise<Token> {
        switch (tokenRequest.proofType) {
            case 'authorizationCode':
                return this.createTokenFromAuthorizationCode(tokenRequest.proof);
            case 'priorAccessToken':
                return this.createTokenFromPriorAccessToken(tokenRequest.proof);
            default:
                throw new BadRequestError("Expected 'grantType' to be either 'authorizationCode' or 'priorAccessToken'.");
        }
    }

    private async createTokenFromAuthorizationCode(code: string): Promise<Token> {

        const config = {
            headers: TokenFactory.basicAuthHeader()
        };
        const body = {
            grant_type: 'authorization_code',
            code
        };
        const eveResponse = await axios.post('https://login.eveonline.com/oauth/token', body, config);
        const {
            access_token: accessToken,
            refresh_token: refreshToken
        } = eveResponse.data;

        const token = new Token(accessToken, refreshToken);
        await token.save();
        return token;
        
    }

    private async createTokenFromPriorAccessToken(priorAccessToken: string): Promise<Token> {

        // Retrieve the old accessToken:refreshToken pair.
        const priorToken = await Token.withCollection((collection: Collection<any>) => {
            return collection.findOne({ accessToken: priorAccessToken });
        });

        if (!priorToken) {
            throw new ResourceNotFoundError(`Did not find a matching entry for access token ${priorAccessToken}.`);
        }

        // Send it to Eve for refreshing.
        const config = {
            headers: TokenFactory.basicAuthHeader()
        };
        const body = {
            grant_type: 'refresh_token',
            refresh_token: priorToken.refreshToken
        };

        let eveResponse;
        try {
            eveResponse = await axios.post('https://login.eveonline.com/v2/oauth/token', body, config);
        } catch (error) {
            if (error.response.status === 400 && error.response.data.error === 'invalid_grant') {
                throw new ResourceNotFoundError(`The Eve API rejected the refresh token.`);
            }
            throw error;
        }
        const {
            access_token: accessToken,
            refresh_token: refreshToken
        } = eveResponse.data;

        // Save the new accessToken:refreshToken pair.
        const token = new Token(accessToken, refreshToken);
        await token.save();

        // Clean up the old token
        await Token.withCollection((collection: Collection<any>) => {
            return collection.deleteOne({ accessToken: priorAccessToken });
        });

        return token;

    }


};
