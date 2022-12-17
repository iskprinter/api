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

      return this._refreshMarketGroups();
    }
  }

  getMarketGroup(): RequestHandler {
    return async (req: Request, res: Response) => {

      // Fetch the existing data from the database and respond with it
      const query = { market_group_id: Number(req.params.marketGroupId) };
      const group = await this.groupsCollection.findOne(query);
      res.json({ group });

      return this._refreshMarketGroup(Number(req.params.marketGroupId));

    }
  }

  getTypes(): RequestHandler {
    return async (req: Request, res: Response) => {
      const types = await this.typesCollection.find({});
      res.json({ types });
      (await this._refreshMarketGroups()).map((async (group) => {
        return this._refreshMarketGroup(group.market_group_id);
      }))
    }
  }

  async _refreshMarketGroup(marketGroupId: number): Promise<Group> {
    const path = `/markets/groups/${marketGroupId}`;
    if (await this.esiService.dataIsFresh({ path })) {
      return this.groupsCollection.findOne({ market_group_id: marketGroupId });
    }
    const freshGroup = await this.esiService.getData<Group>({ path });
    log.info(`Storing response data for path '${path}'...`);
    const group = await this.groupsCollection.updateOne(
      { market_group_id: freshGroup.market_group_id },
      freshGroup,
    );
    await this.typesCollection.putMany(freshGroup.types.map((type) => ({ type_id: type })));
    return group;
  }
  
  async _refreshMarketGroups(): Promise<Group[]> {
    const path = '/markets/groups';
    if (await this.esiService.dataIsFresh({ path })) {
      return this.groupsCollection.find({});
    }
    const marketGroupIds = await this.esiService.getData<Array<number>>({ path });
    log.info(`Storing response data for path '${path}'...`);
    return this.groupsCollection.putMany(marketGroupIds.map((marketGroupId) => ({ market_group_id: marketGroupId })));
  }

}

export default StationTradingController;
