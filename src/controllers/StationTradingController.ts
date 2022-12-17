import { Request, RequestHandler, Response } from 'express'

import { Collection } from 'src/databases';
import { EsiRequest, Group, Type } from 'src/models';
import { EsiService } from 'src/services';
import log from 'src/tools/Logger';

class StationTradingController {
  constructor(
    public esiService: EsiService,
    public esiRequestCollection: Collection<EsiRequest>,
    public groupsCollection: Collection<Group>,
    public typesCollection: Collection<Type>
  ) { }

  getMarketGroups(): RequestHandler {
    return async (req: Request, res: Response) => {
      // Fetch the existing data from the database and respond with it
      const groups = await this.groupsCollection.find({});
      res.json({ groups });
      // Lazily refresh the data if necessary
      return this._refreshMarketGroups();
    }
  }

  getMarketGroup(): RequestHandler {
    return async (req: Request, res: Response) => {
      // Fetch the existing data from the database and respond with it
      const query = { market_group_id: Number(req.params.marketGroupId) };
      const group = await this.groupsCollection.findOne(query);
      res.json({ group });
      // Lazily refresh the data if necessary
      return this._refreshMarketGroup(Number(req.params.marketGroupId));
    }
  }

  getTypes(): RequestHandler {
    return async (req: Request, res: Response) => {
      // Fetch the existing data from the database and respond with it
      const types = await this.typesCollection.find({});
      res.json({ types });
      // Lazily refresh the data if necessary
      return Promise.all((await this._refreshMarketGroups()).map((async (group) => {
        return Promise.all((await this._refreshMarketGroup(group.market_group_id)).types.map(async (typeId) => {
          return this._refreshType(typeId);
        }))
      })));
    }
  }

  getType(): RequestHandler {
    return async (req: Request, res: Response) => {
      // Fetch the existing data from the database and respond with it
      const query = { type_id: Number(req.params.typeId) };
      const type = await this.typesCollection.findOne(query);
      res.json({ type });
      // Lazily refresh the data if necessary
      return this._refreshType(Number(req.params.typeId));
    }
  }

  async _refreshMarketGroup(marketGroupId: number): Promise<Group> {
    const path = `/markets/groups/${marketGroupId}`;
    if (await this.esiService.dataIsFresh({ path }) || await this.esiService.requestIsLocked({ path })) {
      return this.groupsCollection.findOne({ market_group_id: marketGroupId });
    }
    const freshGroup = await this.esiService.getData<Group>({ path });
    log.info(`Storing response data for path '${path}'...`);
    const group = await this.groupsCollection.updateOne(
      { market_group_id: freshGroup.market_group_id },
      freshGroup,
    );
    await this.typesCollection.putMany(freshGroup.types.map((typeId) => ({ type_id: typeId })));
    return group;
  }
  
  async _refreshMarketGroups(): Promise<Group[]> {
    const path = '/markets/groups';
    if (await this.esiService.dataIsFresh({ path }) || await this.esiService.requestIsLocked({ path })) {
      return this.groupsCollection.find({});
    }
    const marketGroupIds = await this.esiService.getData<Array<number>>({ path });
    log.info(`Storing response data for path '${path}'...`);
    return this.groupsCollection.putMany(marketGroupIds.map((marketGroupId) => ({ market_group_id: marketGroupId })));
  }

  async _refreshType(typeId: number): Promise<Type> {
    const path = `/universe/types/${typeId}`;
    if (await this.esiService.dataIsFresh({ path }) || await this.esiService.requestIsLocked({ path })) {
      return this.typesCollection.findOne({ type_id: typeId});
    }
    const freshType = await this.esiService.getData<Type>({ path });
    log.info(`Storing response data for path '${path}'...`);
    const type = await this.typesCollection.updateOne(
      { type_id: freshType.type_id },
      freshType,
    );
    return type
  }

}

export default StationTradingController;
