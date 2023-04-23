import { AssertionError } from 'assert';
import { NextFunction, Request, RequestHandler, Response } from 'express'
import { ResourceNotFoundError } from 'src/errors';
import { RecommendedTradeData, SkillData, TypeData } from 'src/models';

import {
  AuthService,
  EsiService,
  RandomTradeStrategy,
} from 'src/services';
import TradeRecommender from 'src/services/TradeRecommender/TradeRecommender';
import log from 'src/tools/log';

class StationTradingController {
  constructor(
    public authService: AuthService,
    public esiService: EsiService,
    public tradeRecommender: TradeRecommender,
  ) { }

  createRecommendedTrade(): RequestHandler {
    return async (req: Request, res: Response, next: NextFunction) => {
      let recommendedTrade: RecommendedTradeData | undefined;
      try {
        const authHeader = String(req.headers.authorization);
        const stationId = Number(req.body.stationId);
        const structureId = Number(req.body.structureId);
        const characterId = this.authService.getCharacterIdFromAuthHeader(authHeader);

        recommendedTrade = await this.tradeRecommender.createRecommendedTrade(characterId);
        res.json({ recommendedTrade });

        recommendedTrade = await this.tradeRecommender.updateRecommendedTrade({ ...recommendedTrade, status: 'Identifying market region' });
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

        recommendedTrade = await this.tradeRecommender.updateRecommendedTrade({ ...recommendedTrade, status: 'Getting character transactions' });
        const recentTransactions = await this.authService.withEveReauth(authHeader, (eveAccessToken) => {
          return this.esiService.getCharactersWalletTransactions(eveAccessToken, characterId);
        });

        await this.tradeRecommender.updateTransactions(characterId, recentTransactions);

        recommendedTrade = await this.tradeRecommender.updateRecommendedTrade({ ...recommendedTrade, status: 'Getting market types' });
        const marketTypes = (await this.esiService.getMarketTypes())
          .filter((type) => !type.name.match(/blueprint/i))
          .filter((type) => !type.name.match(/reaction formula/i));

        recommendedTrade = await this.tradeRecommender.updateRecommendedTrade({ ...recommendedTrade, status: 'Getting market orders' });
        const marketOrders = await this.esiService.getMarketOrders(regionId);

        const structureOrders = structureId
          ? await this.authService.withEveReauth(authHeader, async (eveAccessToken) => {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            recommendedTrade = await this.tradeRecommender.updateRecommendedTrade({ ...recommendedTrade, status: 'Getting structure orders' });
            return this.esiService.getStructureOrders(eveAccessToken, structureId);
          })
          : [];

        recommendedTrade = await this.tradeRecommender.updateRecommendedTrade({ ...recommendedTrade, status: 'Determining budget' });
        recommendedTrade = await this.tradeRecommender.updateRecommendedTrade({ ...recommendedTrade, status: 'Getting character transactions' });
        const walletBalance = await this.authService.withEveReauth(authHeader, (eveAccessToken) => {
          return this.esiService.getCharactersWallet(eveAccessToken, characterId);
        });
        const activeOrders = await this.authService.withEveReauth(authHeader, (eveAccessToken) => {
          return this.esiService.getCharactersActiveOrders(eveAccessToken, characterId);
        });
        const { skills } = await this.authService.withEveReauth(authHeader, (eveAccessToken) => {
          return this.esiService.getCharactersSkills(eveAccessToken, characterId);
        });
        const maxOrders = this._getMaxOrders(skills, marketTypes);
        const availableOrders = maxOrders - activeOrders.length;
        const budget = walletBalance / availableOrders;

        const orders = [...marketOrders, ...structureOrders]
        const strategy = new RandomTradeStrategy(marketTypes, orders);
        recommendedTrade = await this.tradeRecommender.updateRecommendedTrade({ ...recommendedTrade, status: 'Recommending trade' });
        const rt = await this.tradeRecommender.recommendTrade(characterId, budget, orders, strategy);

        recommendedTrade = {
          ...rt,
          typeName: rt.typeId ? (await this.esiService.getType(rt.typeId)).name : '',
          recommendedTradeId: recommendedTrade.recommendedTradeId,
          characterId,
          status: 'Complete'
        };
        await this.tradeRecommender.updateRecommendedTrade(recommendedTrade);

      } catch (err) {
        if (!res.headersSent) {
          return next(err);
        }
        log.error(err);
        if (recommendedTrade?.recommendedTradeId) {
          await this.tradeRecommender.updateRecommendedTrade({ ...recommendedTrade, status: 'Error' });
        }
      }
    };
  }

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
        ]);

        const systemId = characterLocation.solar_system_id;
        const constellations = await this.esiService.getConstellations();
        const regionId = constellations
            .find((constellation) => constellation.systems.includes(systemId))
            ?.region_id;

        res.json({
          characters: [
            {
              ...character,
              location: {
                ...characterLocation,
                systemId,
                regionId
              }
            }
          ]
        });
      } catch (err) {
        return next(err);
      }
    };
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
    };
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
    };
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

  getRecommendedTrade(): RequestHandler {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const recommendedTradeId = String(req.params.recommendedTradeId);
        const authHeader = String(req.headers.authorization);
        const characterId = this.authService.getCharacterIdFromAuthHeader(authHeader);
        const recommendedTrade = await this.tradeRecommender.getRecommendedTrade(characterId, recommendedTradeId);
        if (!recommendedTrade) {
          throw new ResourceNotFoundError();
        }
        res.json({ recommendedTrade });
      } catch (err) {
        next(err);
      }
    };
  }

  getRecommendedTrades(): RequestHandler {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const authHeader = String(req.headers.authorization);
        const characterId = this.authService.getCharacterIdFromAuthHeader(authHeader);
        const recommendedTrades = await this.tradeRecommender.getRecommendedTrades(characterId);
        res.json({ recommendedTrades });
      } catch (err) {
        next(err);
      }
    };
  }

  getRegions(): RequestHandler {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const regions = await this.esiService.getRegions();
        res.json({ regions });
      } catch (err) {
        next(err);
      }
    };
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
    };
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
    };
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
    };
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
    };
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
    };
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

  _getMaxOrders(skills: SkillData[], marketTypes: TypeData[]): number {
    const tradeSkillId = marketTypes.find((type) => type.name === 'Trade')?.type_id;
    const retailSkillId = marketTypes.find((type) => type.name === 'Retail')?.type_id;
    const wholesaleSkillId = marketTypes.find((type) => type.name === 'Wholesale')?.type_id;
    const tycoonSkillId = marketTypes.find((type) => type.name === 'Tycoon')?.type_id;

    if (!tradeSkillId || !retailSkillId || !wholesaleSkillId || !tycoonSkillId) {
      throw new AssertionError({
        message: `Unable to identify the ID of one or more skills. ${JSON.stringify({
          tradeSkillId,
          retailSkillId,
          wholesaleSkillId,
          tycoonSkillId,
        })}`
      });
    }

    const tradeSkillLevel = skills.find((skill) => skill.skill_id === tradeSkillId)?.active_skill_level || 0;
    const retailSkillLevel = skills.find((skill) => skill.skill_id === retailSkillId)?.active_skill_level || 0;
    const wholesaleSkillLevel = skills.find((skill) => skill.skill_id === wholesaleSkillId)?.active_skill_level || 0;
    const tycoonSkillLevel = skills.find((skill) => skill.skill_id === tycoonSkillId)?.active_skill_level || 0;

    const maxOrders = 5 + tradeSkillLevel * 4 + retailSkillLevel * 8 + wholesaleSkillLevel * 16 + tycoonSkillLevel * 32;
    return maxOrders;
  }

}

export default StationTradingController;
