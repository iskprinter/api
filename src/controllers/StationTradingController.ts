import { Request, RequestHandler, Response } from 'express'

import { Collection } from 'src/databases';
import {
  Deal,
  EsiRequest,
  Type
} from 'src/models';
import {
  DataProxy,
  DealFinder,
  AnyMarketableTypeStrategy,
  EsiService
} from 'src/services';

class StationTradingController {
  constructor(
    public dataProxy: DataProxy,
    public esiService: EsiService,
    public esiRequestCollection: Collection<EsiRequest>,
    public typesCollection: Collection<Type>
  ) { }

  getDeals(): RequestHandler {
    return async (req: Request, res: Response) => {
      const types: Type[] = await this.dataProxy.getTypes();
      const anyMarketableTypeStrategy = new AnyMarketableTypeStrategy(types);
      const dealFinder = new DealFinder(anyMarketableTypeStrategy);
      const deals: Deal[] = dealFinder.getDeals();
      return res.json({ deals });
    };
  }

  getMarketGroups(): RequestHandler {
    return async (req: Request, res: Response) => {
      const groups = await this.dataProxy.getMarketGroups();
      return res.json({ groups });
    };
  }

  getMarketGroup(): RequestHandler {
    return async (req: Request, res: Response) => {
      const group = await this.dataProxy.getMarketGroup(Number(req.params.marketGroupId));
      return res.json({ group });
    };
  }

  getTypes(): RequestHandler {
    return async (req: Request, res: Response) => {
      const types = await this.dataProxy.getTypes();
      return res.json({ types });
    }
  }

  getType(): RequestHandler {
    return async (req: Request, res: Response) => {
      const type = await this.dataProxy.getType(Number(req.params.typeId))
      return res.json({ type });
    };
  }

}

export default StationTradingController;
