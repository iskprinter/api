import { Token } from 'src/entities/Token';
import { TokenFactory } from 'src/entities/TokenFactory';
import { TokenRequest } from 'src/entities/TokenRequest';

export class AuthenticationController {

    async getToken(tokenRequest: TokenRequest): Promise<Token> {
        const tf = new TokenFactory();
        return tf.createToken(tokenRequest);
    }

};
