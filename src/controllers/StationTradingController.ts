import axios from 'axios';
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

      const path = '/markets/groups';
      await this.esiService.getData<Array<number>>({ path }, async (market_group_ids) => {
        log.info(`Storing response data for path '${path}'...`);
        await this.groupsCollection.putMany(market_group_ids.map((market_group_id) => ({ market_group_id })));
      });

    }
  }

  getMarketGroup(): RequestHandler {
    return async (req: Request, res: Response) => {

      // Fetch the existing data from the database and respond with it
      const query = { market_group_id: Number(req.params.marketGroupId) };
      const group = await this.groupsCollection.findOne(query);
      res.json({ group });

      const path = `/markets/groups/${req.params.marketGroupId}`;
      await this.esiService.getData<Group>({ path }, async (group) => {
        log.info(`Storing response data for path '${path}'...`);
        await this.groupsCollection.updateOne(
          { market_group_id: group.market_group_id },
          group
        );
        await this.typesCollection.putMany(group.types.map((type) => ({ type_id: type })));
      });

    }
  }

  getTypes(): RequestHandler {
    return async (req: Request, res: Response) => {

      const types = await this.typesCollection.findOne({});
      res.json({ types });

    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _withoutObjectId(object: any) {
    delete object._id;
    return object;
  }
}

export default StationTradingController;
