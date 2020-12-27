import axios from 'axios';
import { MongoClient, Collection } from 'mongodb';

import { PersistentEntity } from 'src/entities/PersistentEntity';
import { ResourceNotFoundError } from 'src/errors/ResourceNotFoundError';

export class Token implements PersistentEntity {

    static DB_NAME = 'isk-printer';
    static COLLECTION_NAME = 'tokens';

    accessToken: string;
    refreshToken: string;

    constructor(accessToken: string, refreshToken: string) {
        this.accessToken = accessToken;
        this.refreshToken = refreshToken;
    }

    private static basicAuthHeader(): {[key: string]: string} {
        const basicAuth = `${process.env.CLIENT_ID}:${process.env.CLIENT_SECRET}`;
        const encodedBasicAuth = Buffer.from(basicAuth).toString('base64');
        const basicAuthHeader = { Authorization: `Basic ${encodedBasicAuth}` };
        return basicAuthHeader;
    }

    static async fromCode(code: string): Promise<Token> {
        const config = {
            headers: Token.basicAuthHeader()
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

    static async fromRefresh(priorAccessToken: string): Promise<Token> {

        // Retrieve the old accessToken:refreshToken pair.
        const priorToken = await Token.withCollection((collection: Collection<any>) => {
            return collection.findOne({ accessToken: priorAccessToken });
        });

        if (!priorToken) {
            throw new ResourceNotFoundError(`Did not find a matching entry for access token ${priorAccessToken}.`);
        }

        // Send it to Eve for refreshing.
        const config = {
            headers: Token.basicAuthHeader()
        };
        const body = {
            grant_type: 'refresh_token',
            refresh_token: priorToken.refreshToken
        };
        const eveResponse = await axios.post('https://login.eveonline.com/v2/oauth/token', body, config);
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

    static async withCollection(next: (collection: Collection<any>) => Promise<any>): Promise<any> {

        const dbUrl = process.env.DB_URL;
        if (!dbUrl) {
            throw new Error("Environment variable 'DB_URL' is undefined.");
        }
        const client = new MongoClient(dbUrl, { useUnifiedTopology: true });
        await client.connect();
        const db = await client.db(Token.DB_NAME);
        const collection = await db.collection(Token.COLLECTION_NAME);

        const updatedEntity = await next(collection);
    
        await client.close();

        return updatedEntity;
    }

    async save(): Promise<Token> {
        await Token.withCollection((collection: Collection<any>) => collection.insertOne(this));
        return this;
    }

}
