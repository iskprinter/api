import { Request, RequestHandler, Response } from 'express'

import {
  Deal,
  Group,
} from 'src/models';
import {
  DataProxy,
  DealFinder,
  AnyMarketableTypeStrategy,
} from 'src/services';

class StationTradingController {
  constructor(public dataProxy: DataProxy) { }

  getDeals(): RequestHandler {
    return async (req: Request, res: Response) => {
      // Get the set of marketable types
      const groupIds: number[] = await this.dataProxy.getMarketGroupIds();
      const groups: Group[] = await Promise.all(groupIds.map(async (groupId) => this.dataProxy.getMarketGroup(groupId)));
      const marketTypeIds = groups.reduce((marketTypeIds: number[], marketGroup: Group) => [ ...marketTypeIds, ...(marketGroup.types || [])], []);
      const marketTypes = await Promise.all(marketTypeIds.map(async (marketTypeId) => this.dataProxy.getType(marketTypeId)));

      // Compute deals
      const anyMarketableTypeStrategy = new AnyMarketableTypeStrategy(marketTypes);
      const dealFinder = new DealFinder(anyMarketableTypeStrategy);
      const deals: Deal[] = dealFinder.getDeals();
      return res.json({ deals });
    };
  }

  getRegions(): RequestHandler {
    return async (req: Request, res: Response) => {
      const regionIds = await this.dataProxy.getRegionIds();
      const regions = await Promise.all(regionIds.map(async (regionId) => this.dataProxy.getRegion(regionId)));
      return res.json({ regions });
    }
  }

}

export default StationTradingController;
