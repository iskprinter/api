import { AssertionError } from 'assert';
import { NextFunction, Request, RequestHandler, Response } from 'express'

import {
  AuthService,
  EsiService,
  RandomTradeStrategy,
} from 'src/services';
import TradeRecommender from 'src/services/TradeRecommender/TradeRecommender';

class StationTradingController {
  constructor(
    public authService: AuthService,
    public esiService: EsiService,
    public tradeRecommender: TradeRecommender,
  ) { }

  getCharacters(): RequestHandler {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const authorization = String(req.headers.authorization);
        const characterId = this.authService.getCharacterIdFromAuthHeader(authorization);
        const [
          character,
          characterLocation,
        ] = await Promise.all([
          this.esiService.getCharacter(characterId),
          this.authService.withEveReauth(authorization, (eveAccessToken) => {
            return this.esiService.getCharacterLocation(eveAccessToken, characterId);
          }),
        ])
        res.json({
          characters: [
            {
              ...character,
              location: characterLocation
            }
          ]
        });
      } catch (err) {
        return next(err);
      }
    }
  }

  //   getCurrentLocation(): RequestHandler {
  //     return async (req: Request, res: Response, next: NextFunction) => {
  //       const authorization = String(req.headers.authorization);
  //       const characterId = this.authService.getCharacterIdFromAuthorization(authorization);
  //       const characterLocation = await this.dataProxy.getCharacterLocation(characterId, authorization);
  //       const system = (await this.dataProxy.getSystems({ systemId: characterLocation.solar_system_id }))[0];
  //       const region = await system.getRegion();
  //       res.json({
  //         regionId: region.region_id,
  //         systemId: system.system_id,
  //         ...(characterLocation.station_id && { stationId: characterLocation.station_id }),
  //         ...(characterLocation.structure_id && { structureId: characterLocation.structure_id }),
  //       });
  //       return next();
  //     }
  //   }

  getConstellations(): RequestHandler {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const regionId = Number(req.query['region-id']);
        const constellations = await this.esiService.getConstellations({ regionId });
        res.json({ constellations });
      } catch (err) {
        next(err);
      }
    }
  }

  getCharactersOrders(): RequestHandler {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const authHeader = String(req.headers.authorization);
        const characterId = this.authService.getCharacterIdFromAuthHeader(req.headers.authorization);
        const [
          activeOrders,
          historicalOrders,
        ] = await Promise.all([
          this.authService.withEveReauth(authHeader, async (eveAccessToken) => {
            return await this.esiService.getCharactersActiveOrders(eveAccessToken, characterId);
          }),
          this.authService.withEveReauth(authHeader, async (eveAccessToken) => {
            return await this.esiService.getCharactersHistoricalOrders(eveAccessToken, characterId);
          })
        ]);
        const orders = [...activeOrders, ...historicalOrders];
        res.json({ orders });
      } catch (err) {
        next(err);
      }
    }
  }

  getCharactersTrades(): RequestHandler {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const authHeader = String(req.headers.authorization);
        const characterId = this.authService.getCharacterIdFromAuthHeader(req.headers.authorization);
        const recentTransactions = await this.authService.withEveReauth(authHeader, async (eveAccessToken) => {
          return await this.esiService.getCharactersWalletTransactions(eveAccessToken, characterId);
        });
        await this.tradeRecommender.updateTransactions(characterId, recentTransactions);
        const tradesWithoutTypeNames = await this.tradeRecommender.getPastTrades(characterId);
        const trades = await Promise.all(tradesWithoutTypeNames.map(async (trade) => ({
          ...trade,
          typeName: (await this.esiService.getType(trade.typeId)).name,
        })));
        res.json({ trades });
      } catch (err) {
        next(err);
      }
    }
  }

  getRecommendedTrades(): RequestHandler {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const authHeader = String(req.headers.authorization);
        const stationId = Number(req.query['station-id']);
        const structureId = Number(req.query['structure-id']);

        const systemId = await (async () => {
          if (stationId) {
            const station = await this.esiService.getStation(stationId);
            return station.system_id;
          } else if (structureId) {
            const structure = await this.authService.withEveReauth(authHeader, (eveAccessToken) => {
              return this.esiService.getStructure(eveAccessToken, structureId);
            });
            return structure.solar_system_id;
          } else {
            throw new AssertionError({ message: 'Neither stationId nor structureId were provided to getRecommendedTrades().' });
          }
        })();
        const regionId = (await this.esiService.getConstellations())
          .find((constellation) => constellation.systems.includes(systemId))
          ?.region_id;
        if (!regionId) {
          throw new AssertionError({ message: `Failed to find the region in which system ${systemId} resides.` });
        }

        const characterId = this.authService.getCharacterIdFromAuthHeader(authHeader);
        const recentTransactions = await this.authService.withEveReauth(authHeader, (eveAccessToken) => {
          return this.esiService.getCharactersWalletTransactions(eveAccessToken, characterId);
        });

        await this.tradeRecommender.updateTransactions(characterId, recentTransactions);

        const [
          marketTypes,
          marketOrders,
        ] = await Promise.all([
          this.esiService.getMarketTypes(),
          this.esiService.getMarketOrders(regionId),
        ]);
        const structureOrders = structureId
          ? await this.authService.withEveReauth(authHeader, (eveAccessToken) => {
            return this.esiService.getStructureOrders(eveAccessToken, structureId);
          })
          : [];
        const orders = [...marketOrders, ...structureOrders]
        const randomTradeStrategy = new RandomTradeStrategy(marketTypes, orders);
        const recommendedTrades = await this.tradeRecommender.recommendTrades(characterId, randomTradeStrategy);
        res.json({ recommendedTrades });
      } catch (err) {
        return next(err);
      }
    };
  }


  // getMarketGroups(): RequestHandler {
  //   return async (req: Request, res: Response, next: NextFunction) => {
  //     const groups = await this.esiService.getGroups();
  //     res.json({ groups });
  //     return next();
  //   };
  // }

  //   getOrders(): RequestHandler {
  //     return async (req: Request, res: Response, next: NextFunction) => {
  //       const orders = await this.dataProxy.getOrders();
  //       res.json({ orders });
  //       return next();
  //     }
  //   }

  getRegions(): RequestHandler {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const regions = await this.esiService.getRegions();
        res.json({ regions });
      } catch (err) {
        next(err);
      }
    }
  }

  getStation(): RequestHandler {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const stationId = Number(req.params.stationId);
        const station = await this.esiService.getStation(stationId);
        res.json({ station });
      } catch (err) {
        next(err);
      }
    }
  }

  getStations(): RequestHandler {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const stations = await this.esiService.getStations({
          // regionId: Number(req.query['region-id']),
          // constellationId: Number(req.query['constellation-id']),
          systemId: Number(req.query['system-id']),
        })
        res.json({ stations });
      } catch (err) {
        next(err);
      }
    }
  }

  getStructure(): RequestHandler {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const authHeader = String(req.headers.authorization);
        const structureId = Number(req.params.structureId);
        const structure = await this.authService.withEveReauth(authHeader, async (eveAccessToken) => {
          return await this.esiService.getStructure(eveAccessToken, structureId);
        });
        res.json({ structure });
      } catch (err) {
        next(err);
      }
    }
  }

  getStructures(): RequestHandler {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const authHeader = String(req.headers.authorization);
        const structures = await this.authService.withEveReauth(authHeader, async (eveAccessToken) => {
          return await this.esiService.getStructures(eveAccessToken, {
            // regionId: Number(req.query['region-id']),
            // constellationId: Number(req.query['constellation-id']),
            systemId: Number(req.query['system-id']),
          });
        });
        res.json({ structures });
      } catch (err) {
        next(err);
      }
    }
  }

  getSystems(): RequestHandler {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const regionId = Number(req.query['region-id']);
        const systems = await this.esiService.getSystems({ regionId });
        res.json({ systems });
      } catch (err) {
        next(err);
      }
    }
  }

  //   updateCharacters(): RequestHandler {
  //     return async (req: Request, res: Response, next: NextFunction) => {
  //       const authorization = String(req.headers.authorization);
  //       const characterId = this.authService.getCharacterIdFromAuthorization(authorization);
  //       await Promise.all([
  //         this.dataProxy.updateCharacter(characterId),
  //         this.dataProxy.updateCharacterLocation(characterId, authorization),
  //         this.dataProxy.updateCharacterSkills(characterId, authorization),
  //       ]);
  //       return next();
  //     }
  //   }

  //   updateConstellations(): RequestHandler {
  //     return async (req: Request, res: Response, next: NextFunction) => {
  //       await this.dataProxy.updateConstellations();
  //       return next();
  //     }
  //   }

  //   updateRecommendedTrades(): RequestHandler {
  //     return async (req: Request, res: Response, next: NextFunction) => {
  //       const stationId = Number(req.query['station-id']);
  //       const structureId = Number(req.query['structure-id']);
  //       let regionId;
  //       if (stationId) {
  //         const station = await this.dataProxy.getStation(stationId);
  //         regionId = (await station.getRegion()).region_id;
  //       } else if (structureId) {
  //         const structure = await this.dataProxy.getStructure(structureId);
  //         regionId = (await structure.getRegion()).region_id;
  //       } else {
  //         throw new AssertionError({ message: 'Our validator has failed us.' });
  //       }
  //       const orderType = 'all';
  //       const authorization = String(req.headers.authorization);
  //       const characterId = this.authService.getCharacterIdFromAuthorization(authorization);
  //       await Promise.all([
  //         this.dataProxy.updateMarketGroups(),
  //         this.dataProxy.updateTypes(),
  //         this.dataProxy.updateMarketOrders(regionId, orderType),
  //         this.dataProxy.updateCharacter(characterId),
  //         this.dataProxy.updateCharacterSkills(characterId, authorization),
  //         ...(structureId ? [this.dataProxy.updateStructureOrders(structureId, authorization)] : []),
  //       ]);
  //       return next();
  //     }
  //   }

  //   updateMarketGroups(): RequestHandler {
  //     return async (req: Request, res: Response, next: NextFunction) => {
  //       await this.dataProxy.updateMarketGroups();
  //       return next();
  //     };
  //   }

  //   updateOrders(): RequestHandler {
  //     return async (req: Request, res: Response, next: NextFunction) => {
  //       const regionId = Number(req.query['region-id']);
  //       const orderType = String(req.query['order-type']);
  //       const structureId = Number(req.query['structure-id']);
  //       const authorization = String(req.headers.authorization); 
  //       await Promise.all([
  //         this.dataProxy.updateMarketOrders(regionId, orderType),
  //         ...(structureId ? [this.dataProxy.updateStructureOrders(structureId, authorization)] : []),
  //       ]);
  //       return next();
  //     }
  //   }

  //   updateRegions(): RequestHandler {
  //     return async (req: Request, res: Response, next: NextFunction) => {
  //       await this.dataProxy.updateRegions();
  //       return next();
  //     }
  //   }

  //   updateStations(): RequestHandler {
  //     return async (req: Request, res: Response, next: NextFunction) => {
  //       this.dataProxy.updateConstellations();
  //       await this.dataProxy.updateStations();
  //       return next();
  //     };
  //   }

  //   updateStructures(): RequestHandler {
  //     return async (req: Request, res: Response, next: NextFunction) => {
  //       await this.dataProxy.updateConstellations();
  //       const authorization = String(req.headers.authorization);
  //       await this.dataProxy.updateStructures(authorization);
  //       return next();
  //     };
  //   }

  //   updateSystems(): RequestHandler {
  //     return async (req: Request, res: Response, next: NextFunction) => {
  //       await this.dataProxy.updateSystems()
  //       return next()
  //     };
  //   }

  //   updateTypes(): RequestHandler {
  //     return async (req: Request, res: Response, next: NextFunction) => {
  //       await this.dataProxy.updateTypes();
  //       return next()
  //     };
  //   }

}

export default StationTradingController;
