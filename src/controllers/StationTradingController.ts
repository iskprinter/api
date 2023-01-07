import { Request, RequestHandler, Response } from 'express'

import { Collection } from 'src/databases';
import { Deal, EsiRequest, Group, Type } from 'src/models';
import { EsiRequestConfig, EsiService } from 'src/services';
import { DealFinder } from 'src/services';

class StationTradingController {
  constructor(
    public esiService: EsiService,
    public esiRequestCollection: Collection<EsiRequest>,
    public groupsCollection: Collection<Group>,
    public typesCollection: Collection<Type>
  ) { }

  getDeals(): RequestHandler {
    return async (req: Request, res: Response) => {
      const deals: Deal[] = [{
        typeName: 'Tritanium'
      }];
      return res.json({ deals });
    };
  }

  getMarketGroups(): RequestHandler {
    return async (req: Request, res: Response) => {
      const esiRequestConfig: EsiRequestConfig<number[], Group[]> = {
        query: async () => this.groupsCollection.find({}),
        path: '/market/groups',
        update: async (marketGroupIds) => this.groupsCollection.putMany(
          marketGroupIds.map((marketGroupId) => ({ market_group_id: marketGroupId }))
        )
      };
      const groups = await this.esiService.request(esiRequestConfig);
      return res.json({ groups });
    };
  }

  getMarketGroup(): RequestHandler {
    return async (req: Request, res: Response) => {
      const esiRequestConfig: EsiRequestConfig<Group, Group> = {
        query: () => this.groupsCollection.findOne({ market_group_id: Number(req.params.marketGroupId) }),
        path: `/market/groups/${req.params.marketGroupId}`,
        update: async (group) => this.groupsCollection.updateOne({ market_group_id: group.market_group_id }, group)
      };
      const group = await this.esiService.request(esiRequestConfig);
      return res.json({ group });
    };
  }

  getTypes(): RequestHandler {
    return async (req: Request, res: Response) => {
      const esiRequestConfig: EsiRequestConfig<number[], Type[]> = {
        query: () => this.typesCollection.find({}),
        path: '/universe/types',
        update: async (typeIds) => this.typesCollection.putMany(
          typeIds.map((typeId) => ({ type_id: typeId }))
        )
      };
      const types = await this.esiService.request(esiRequestConfig);
      return res.json({ types });
    }
  }

  getType(): RequestHandler {
    return async (req: Request, res: Response) => {
      const esiRequestConfig: EsiRequestConfig<Type, Type> = {
        query: () => this.typesCollection.findOne({ type_id: Number(req.params.typeId) }),
        path: `/universe/types/${req.params.typeId}`,
        update: async (type) => this.typesCollection.updateOne({ type_id: type.type_id }, type)
      };
      const type = await this.esiService.request(esiRequestConfig);
      return res.json({ type });
    };
  }

}

export default StationTradingController;
