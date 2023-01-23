import { AssertionError } from 'assert';
import { NextFunction, Request, RequestHandler, Response } from 'express'

import { AuthService, DataProxy } from 'src/services';

class StationTradingController {
  constructor(
    public authService: AuthService,
    public dataProxy: DataProxy
  ) { }

  getCharacters(): RequestHandler {
    return async (req: Request, res: Response, next: NextFunction) => {
      const authorization = String(req.headers.authorization);
      const characterId = this.authService.getCharacterIdFromAuthorization(authorization);
      const characters = await this.dataProxy.getCharacters({ character_id: characterId });
      res.json({ characters });
      return next();
    }
  }

  getCurrentLocation(): RequestHandler {
    return async (req: Request, res: Response, next: NextFunction) => {
      const authorization = String(req.headers.authorization);
      const characterId = this.authService.getCharacterIdFromAuthorization(authorization);
      const characterLocation = await this.dataProxy.getCharacterLocation(characterId, authorization);
      const system = (await this.dataProxy.getSystems({ systemId: characterLocation.solar_system_id }))[0];
      const region = await system.getRegion();
      res.json({
        regionId: region.region_id,
        systemId: system.system_id,
        ...(characterLocation.station_id && { stationId: characterLocation.station_id }),
        ...(characterLocation.structure_id && { structureId: characterLocation.structure_id }),
      });
      return next();
    }
  }

  getConstellations(): RequestHandler {
    return async (req: Request, res: Response, next: NextFunction) => {
      const constellations = await this.dataProxy.getConstellations();
      res.json({ constellations });
      return next();
    }
  }

  getDeals(): RequestHandler {
    return async (req: Request, res: Response, next: NextFunction) => {
      const authorization = String(req.headers.authorization);
      const characterId = this.authService.getCharacterIdFromAuthorization(authorization);
      const characters = await this.dataProxy.getCharacters({ character_id: characterId });
      if (characters.length === 0) {
        res.json({ deals: [] });
        return next();
      }
      const character = characters[0];

      const stationId = Number(req.query['station-id']);
      const structureId = Number(req.query['structure-id']);
      let regionId;
      if (stationId) {
        const station = await this.dataProxy.getStation(stationId);
        regionId = (await station.getRegion()).region_id;
      } else if (structureId) {
        const structure = await this.dataProxy.getStructure(structureId);
        regionId = (await structure.getRegion()).region_id;
      } else {
        throw new AssertionError({ message: 'Our validator has failed us.' });
      }
      const deals = await this.dataProxy.getDeals(character, regionId, { structureId });
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
      const systemId = Number(req.query['system-id']);
      const regions = await this.dataProxy.getRegions({ systemId });
      res.json({ regions });
      return next();
    }
  }

  getStation(): RequestHandler {
    return async (req: Request, res: Response, next: NextFunction) => {
      const stationId = Number(req.params.stationId);
      const station = await this.dataProxy.getStation(stationId);
      res.json({ station });
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

  getStructure(): RequestHandler {
    return async (req: Request, res: Response, next: NextFunction) => {
      const structureId = Number(req.params.structureId);
      const structure = await this.dataProxy.getStructure(structureId)
      res.json({ structure });
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

  updateCharacters(): RequestHandler {
    return async (req: Request, res: Response, next: NextFunction) => {
      const authorization = String(req.headers.authorization);
      const characterId = this.authService.getCharacterIdFromAuthorization(authorization);
      await Promise.all([
        this.dataProxy.updateCharacter(characterId),
        this.dataProxy.updateCharacterLocation(characterId, authorization),
        this.dataProxy.updateCharacterSkills(characterId, authorization),
      ]);
      return next();
    }
  }

  updateConstellations(): RequestHandler {
    return async (req: Request, res: Response, next: NextFunction) => {
      await this.dataProxy.updateConstellations();
      return next();
    }
  }

  updateDeals(): RequestHandler {
    return async (req: Request, res: Response, next: NextFunction) => {
      const stationId = Number(req.query['station-id']);
      const structureId = Number(req.query['structure-id']);
      let regionId;
      if (stationId) {
        const station = await this.dataProxy.getStation(stationId);
        regionId = (await station.getRegion()).region_id;
      } else if (structureId) {
        const structure = await this.dataProxy.getStructure(structureId);
        regionId = (await structure.getRegion()).region_id;
      } else {
        throw new AssertionError({ message: 'Our validator has failed us.' });
      }
      const orderType = 'all';
      const authorization = String(req.headers.authorization);
      const characterId = this.authService.getCharacterIdFromAuthorization(authorization);
      await Promise.all([
        this.dataProxy.updateMarketGroups(),
        this.dataProxy.updateTypes(),
        this.dataProxy.updateMarketOrders(regionId, orderType),
        this.dataProxy.updateCharacter(characterId),
        this.dataProxy.updateCharacterSkills(characterId, authorization),
        ...(structureId ? [this.dataProxy.updateStructureOrders(structureId, authorization)] : []),
      ]);
      return next();
    }
  }

  updateMarketGroups(): RequestHandler {
    return async (req: Request, res: Response, next: NextFunction) => {
      await this.dataProxy.updateMarketGroups();
      return next();
    };
  }

  updateOrders(): RequestHandler {
    return async (req: Request, res: Response, next: NextFunction) => {
      const regionId = Number(req.query['region-id']);
      const orderType = String(req.query['order-type']);
      const structureId = Number(req.query['structure-id']);
      const authorization = String(req.headers.authorization); 
      await Promise.all([
        this.dataProxy.updateMarketOrders(regionId, orderType),
        ...(structureId ? [this.dataProxy.updateStructureOrders(structureId, authorization)] : []),
      ]);
      return next();
    }
  }

  updateRegions(): RequestHandler {
    return async (req: Request, res: Response, next: NextFunction) => {
      await this.dataProxy.updateRegions();
      return next();
    }
  }

  updateStations(): RequestHandler {
    return async (req: Request, res: Response, next: NextFunction) => {
      this.dataProxy.updateConstellations();
      await this.dataProxy.updateStations();
      return next();
    };
  }

  updateStructures(): RequestHandler {
    return async (req: Request, res: Response, next: NextFunction) => {
      await this.dataProxy.updateConstellations();
      const authorization = String(req.headers.authorization);
      await this.dataProxy.updateStructures(authorization);
      return next();
    };
  }

  updateSystems(): RequestHandler {
    return async (req: Request, res: Response, next: NextFunction) => {
      await this.dataProxy.updateSystems()
      return next()
    };
  }

  updateTypes(): RequestHandler {
    return async (req: Request, res: Response, next: NextFunction) => {
      await this.dataProxy.updateTypes();
      return next()
    };
  }

}

export default StationTradingController;
