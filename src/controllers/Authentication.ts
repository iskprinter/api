import { Token } from 'src/entities/Token'

export class AuthenticationController {

    async getTokenFromCode(code: string) {
        const token = await Token.fromCode(code);
        return token.accessToken;
    }

    async getTokenFromRefresh(accessToken: string) {
        const token = await Token.fromRefresh(accessToken);
        return token.accessToken;
    }

}
