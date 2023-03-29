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
      type PortraitResponse = {
        px512x512: string,
      };
      const esiRes = await this.esiService._request<PortraitResponse>({
        method: 'get',
        url: `/v3/characters/${characterId}/portrait`
      });
      res.json({ portraitUrl: esiRes.px512x512 });
    }
  }
}
