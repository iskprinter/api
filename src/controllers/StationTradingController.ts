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

  getConstellations(): RequestHandler {
    return async (req: Request, res: Response) => {
      const constellationIds = await this.dataProxy.getConstellationIds();
      const constellations = await Promise.all(constellationIds.map(async (constellationId) => this.dataProxy.getConstellation(constellationId)));
      return res.json({ constellations });
    }
  }

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

  getSystems(): RequestHandler {
    return async (req: Request, res: Response) => {
      const systemIds = await this.dataProxy.getSystemIds();
      const systems = await Promise.all(systemIds.map(async (systemId) => this.dataProxy.getSystem(systemId)));
      if (req.query.constellationId) {
        return res.json({ systems: systems.filter((system) => system.constellation_id === Number(req.query.constellationId)) });
      }
      if (req.query.regionId) {
        const constellationIds = await this.dataProxy.getConstellationIds();
        const constellations = await Promise.all(constellationIds.map(async (constellationId) => this.dataProxy.getConstellation(constellationId)));
        const matchingConstellations = constellations.filter((constellation) => constellation.region_id === Number(req.query.regionId));
        const matchingSystemIds = matchingConstellations.reduce((systemIds: number[], constellation) => [ ...systemIds, ...(constellation.systems || [])], []);
        const matchingSystems = systems.filter((system) => matchingSystemIds.includes(system.system_id))
        return res.json({ systems: matchingSystems });
      }
      return res.json({ systems });
    }
  }
}

export default StationTradingController;
