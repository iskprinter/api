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

  getStations(): RequestHandler {
    return async (req: Request, res: Response) => {
      if (req.query.systemId) {
        const system = await this.dataProxy.getSystem(Number(req.query.systemId));
        const stationIds = system.stations || [];
        const stations = await Promise.all(stationIds.map(async (stationId) => this.dataProxy.getStation(stationId)));
        return res.json({ stations });
      }
      if (req.query.constellationId) {
        const constellationIds = await this.dataProxy.getConstellationIds();
        const constellations = await Promise.all(constellationIds.map(async (constellationId) => this.dataProxy.getConstellation(constellationId)));
        const matchingConstellation = constellations.find((constellation) => constellation.constellation_id === Number(req.query.constellationId));
        const matchingSystemIds = matchingConstellation?.systems;
        if (!matchingSystemIds) {
          return res.json({ stations: null });
        }
        const matchingSystems = await Promise.all(matchingSystemIds.map((systemId) => this.dataProxy.getSystem(systemId)));
        const stationIds = matchingSystems.reduce((stationIds: number[], system) => [ ...stationIds, ...(system.stations || []) ], []);
        const stations = await Promise.all(stationIds.map(async (stationId) => this.dataProxy.getStation(stationId)));
        return res.json({ stations });
      }
      if (req.query.regionId) {
        const constellationIds = await this.dataProxy.getConstellationIds();
        const constellations = await Promise.all(constellationIds.map(async (constellationId) => this.dataProxy.getConstellation(constellationId)));
        const matchingConstellations = constellations.filter((constellation) => constellation.region_id === Number(req.query.regionId));
        const matchingSystemIds = matchingConstellations.reduce((systemIds: number[], constellation) => [ ...systemIds, ...(constellation.systems || [])], []);
        const matchingSystems = await Promise.all(matchingSystemIds.map(async (systemId) => this.dataProxy.getSystem(systemId)));
        const stationIds = matchingSystems.reduce((stationIds: number[], system) => [ ...stationIds, ...(system.stations || []) ], []);
        const stations = await Promise.all(stationIds.map(async (stationId) => this.dataProxy.getStation(stationId)));
        return res.json({ stations });
      }
      const systemIds = await this.dataProxy.getSystemIds();
      const systems = await Promise.all(systemIds.map(async (systemId) => this.dataProxy.getSystem(systemId)));
      const stationIds = systems.reduce((stationIds: number[], system) => [ ...stationIds, ...(system.stations || []) ], []);
      const stations = await Promise.all(stationIds.map(async (stationId) => this.dataProxy.getStation(stationId)));
      return res.json({ stations });
    }
  }

  getStructures(): RequestHandler {
    return async (req: Request, res: Response) => {
      const structureIds = await this.dataProxy.getStructureIds();
      const structures = await Promise.all(structureIds.map(async (structureId) => this.dataProxy.getStructure(req.headers.authorization as string, structureId)));
      if (req.query.systemId) {
        return res.json({ structures: structures.filter((structure) => structure.solar_system_id === Number(req.query.systemId)) });
      }
      if (req.query.constellationId) {
        const constellationIds = await this.dataProxy.getConstellationIds();
        const constellations = await Promise.all(constellationIds.map(async (constellationId) => this.dataProxy.getConstellation(constellationId)));
        const matchingConstellation = constellations.find((constellation) => constellation.constellation_id === Number(req.query.constellationId));
        const matchingSystemIds = matchingConstellation?.systems;
        if (!matchingSystemIds) {
          return res.json({ stations: null });
        }
        return res.json({ structures: structures.filter((structure) => structure.solar_system_id ? matchingSystemIds.includes(structure.solar_system_id) : false) });
      }
      if (req.query.regionId) {
        const constellationIds = await this.dataProxy.getConstellationIds();
        const constellations = await Promise.all(constellationIds.map(async (constellationId) => this.dataProxy.getConstellation(constellationId)));
        const matchingConstellations = constellations.filter((constellation) => constellation.region_id === Number(req.query.regionId));
        const matchingSystemIds = matchingConstellations.reduce((systemIds: number[], constellation) => [ ...systemIds, ...(constellation.systems || [])], []);
        return res.json({ structures: structures.filter((structure) => structure.solar_system_id ? matchingSystemIds.includes(structure.solar_system_id) : false) });
      }
      return res.json({ structures });
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
