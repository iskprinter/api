import { AxiosError } from 'axios';
import { Request, RequestHandler, Response } from 'express'
import { AuthService, EsiService } from 'src/services';

export default class ProfileController {
  constructor(
    public authService: AuthService,
    public esiService: EsiService,
  ) { }
  getCharacterPortrait(): RequestHandler {
    return async (req: Request, res: Response) => {
      const characterId = Number(req.params.characterId);
      const iskprinterAccessToken = this.authService.getTokenFromAuthorizationHeader(req.headers.authorization);
      const tokens = await this.authService.getTokens({ iskprinterAccessToken });
      const request = (eveAccessToken: string) => {
        return this.esiService.getPage<{
          px512x512: string;
        }>({
          headers: {
            authorization: `Bearer ${eveAccessToken}`
          },
          method: 'get',
          url: `characters/${characterId}/portrait`,
        }, 1);
      }
      const page = await (async () => {
        try {
          return await request(tokens.eveAccessToken);
        } catch (err) {
          if (err instanceof AxiosError) {
            if (!err.response) {
              throw err;
            }
            if (![401, 403].includes(err.response.status)) {
              throw err;
            }
            const newTokens = await this.authService.refreshEveTokens(tokens.eveRefreshToken);
            return request(newTokens.eveAccessToken);
          }
          throw err;
        }
      })();
      res.json({ portraitUrl: page.data.px512x512 });
    }
  }
}
