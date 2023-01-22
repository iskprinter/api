import { NextFunction, Request, RequestHandler, Response } from 'express'

import { AuthService, DataProxy } from 'src/services';
import log from 'src/tools/Logger';

class StationTradingController {
  constructor(
    public authService: AuthService,
    public dataProxy: DataProxy
  ) { }

  getConstellations(): RequestHandler {
    return async (req: Request, res: Response, next: NextFunction) => {
      const constellations = await this.dataProxy.getConstellations();
      res.json({ constellations });
      return next();
    }
  }

  getDeals(): RequestHandler {
    return async (req: Request, res: Response, next: NextFunction) => {
      const regionId = await this._getRegionIdFromLocation({
        stationId: Number(req.query['station-id']),
        structureId: Number(req.query['structure-id']),
      })
      const deals = await this.dataProxy.getDeals(regionId);
      res.json({ deals });
      return next();
    };
  }

  getMarketGroups(): RequestHandler {
    return async (req: Request, res: Response, next: NextFunction) => {
      const groups = await this.dataProxy.getGroups();
      res.json({ groups });
      return next();
    };
  }

  getOrders(): RequestHandler {
    return async (req: Request, res: Response, next: NextFunction) => {
      const orders = await this.dataProxy.getOrders();
      res.json({ orders });
      return next();
    }
  }

  getRegions(): RequestHandler {
    return async (req: Request, res: Response, next: NextFunction) => {
      const regions = await this.dataProxy.getRegions();
      res.json({ regions });
      return next();
    }
  }

  getStations(): RequestHandler {
    return async (req: Request, res: Response, next: NextFunction) => {
      const stations = await this.dataProxy.getStations({
        regionId: Number(req.query['region-id']),
        constellationId: Number(req.query['constellation-id']),
        systemId: Number(req.query['system-id']),
      })
      res.json({ stations });
      return next();
    }
  }

  getStructures(): RequestHandler {
    return async (req: Request, res: Response, next: NextFunction) => {
      const structures = await this.dataProxy.getStructures({
        regionId: Number(req.query['region-id']),
        constellationId: Number(req.query['constellation-id']),
        systemId: Number(req.query['system-id']),
      })
      res.json({ structures });
      return next();
    }
  }

  getSystems(): RequestHandler {
    return async (req: Request, res: Response, next: NextFunction) => {
      const systems = await this.dataProxy.getSystems({
        regionId: Number(req.query['region-id']),
        constellationId: Number(req.query['constellation-id']),
      });
      res.json({ systems });
      return next();
    }
  }

  updateDeals(): RequestHandler {
    return async (req: Request, res: Response, next: NextFunction) => {

      this.dataProxy.updateTypes();

      const regionId = await this._getRegionIdFromLocation({
        stationId: Number(req.query['station-id']),
        structureId: Number(req.query['structure-id']),
      });
      const orderType = 'all';
      this.dataProxy.updateMarketOrders(regionId, orderType);
      return next();
    }
  }

  updateMarketGroups(): RequestHandler {
    return async (req: Request, res: Response, next: NextFunction) => {
      this.dataProxy.updateMarketGroups();
      return next();
    };
  }

  updateOrders(): RequestHandler {
    return async (req: Request, res: Response, next: NextFunction) => {
      const regionId = Number(req.query['region-id']);
      const orderType = String(req.query['order-type']);
      this.dataProxy.updateMarketOrders(regionId, orderType);
      return next();
    }
  }

  updateRegions(): RequestHandler {
    return async (req: Request, res: Response, next: NextFunction) => {
      this.dataProxy.updateRegions();
      return next();
    }
  }

  updateStations(): RequestHandler {
    return async (req: Request, res: Response, next: NextFunction) => {
      this.dataProxy.updateConstellations();
      this.dataProxy.updateStations();
      return next();
    };
  }

  updateStructures(): RequestHandler {
    return async (req: Request, res: Response, next: NextFunction) => {
      this.dataProxy.updateConstellations();
      this.dataProxy.updateStructures(String(req.headers.authorization));
      return next();
    };
  }

  updateSystems(): RequestHandler {
    return async (req: Request, res: Response, next: NextFunction) => {
      this.dataProxy.updateSystems()
      return next()
    };
  }

  updateTypes(): RequestHandler {
    return async (req: Request, res: Response, next: NextFunction) => {
      this.dataProxy.updateTypes();
      return next()
    };
  }

  async _getRegionIdFromLocation({ stationId, structureId }: { stationId?: number, structureId?: number }): Promise<number> {

    let systemId;

    if (stationId) {
      log.info('getting systemId from stationId...');
      const stations = await this.dataProxy.getStations({ stationId });
      if (stations.length !== 1) {
        throw new Error(`Unable to find exactly 1 station with with requested station_id ${stationId}.`);
      }
      const station = stations[0];
      systemId = station.system_id;
    }

    if (structureId) {
      log.info('getting systemId from structureId...');
      const structures = await this.dataProxy.getStructures({ structureId });
      if (structures.length !== 1) {
        throw new Error(`Unable to find exactly 1 structure with with requested structure_id ${structureId}.`);
      }
      const structure = structures[0];
      systemId = structure.solar_system_id;
    }

    log.info('getting regionId from systemId...');
    const constellations = await this.dataProxy.getConstellations({ systems: systemId });
    if (constellations.length !== 1) {
      throw new Error(`Unable to find exactly 1 constellation with with requested system_id ${systemId}.`);
    }
    const constellation = constellations[0];
    return Number(constellation.region_id);
  }
}

export default StationTradingController;
