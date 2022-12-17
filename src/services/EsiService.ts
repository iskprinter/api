import requester from 'src/tools/Requester';
import { Collection } from "src/databases";
import EsiRequest from "src/models/EsiRequest";
import log from "src/tools/Logger";

export default class EsiService {

  constructor(public esiRequestCollection: Collection<EsiRequest>) { }

  async getData<T>({ path }: { path: string }): Promise<T> {
    return new Promise((resolve, reject) => {

      // Lock the EsiRequest document.
      log.info(`Locking request path '${path}'...`);
      return this._lockRequest({ path })
        .then(() => {
          // Lazily (eventually) update the data in the database.
          log.info(`Getting path '${path}'...`);
          return requester.get<T>(`https://esi.evetech.net/latest${path}`)
        })
        .then((esiResponse) => {
          resolve(esiResponse.data);
          // Unlock the EsiRequest collection and store the expiration time.
          log.info(`Storing expiration time for path '${path}'...`);
          return this._setExpiry({ path }, Date.parse(esiResponse.headers.expires as string));        })
        .catch((err) => reject(err))
        .finally(() => {
          // Unlock the EsiRequest collection and store the expiration time.
          log.info(`Unlocking request path '${path}'...`);
          return this._unlockRequest({ path });
        });

    });
  }

  async dataIsFresh({ path }: { path: string }): Promise < boolean > {
      const ongoingRequests = await this.esiRequestCollection.find({ path });
      const dataIsFresh =  ongoingRequests.length > 0 && ongoingRequests[0].expires > Date.now();
      log.info(`Data for request path ${path} is still fresh.`);
      return dataIsFresh;
    }

  async _lockRequest({ path }: { path: string }): Promise < EsiRequest > {
      return this.esiRequestCollection.updateOne(
        { path },
        { inProgress: true }
      );
    }

  async _setExpiry({ path }: { path: string }, expires: number): Promise < EsiRequest > {
      return this.esiRequestCollection.updateOne(
        { path },
        { expires }
      );
    }

  async _unlockRequest({ path }: { path: string }): Promise < EsiRequest > {
      return this.esiRequestCollection.updateOne(
        { path },
        { inProgress: false }
      );
    }

}
