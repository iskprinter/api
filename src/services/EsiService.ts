import axios from "axios";
import { Collection } from "src/databases";
import EsiRequest from "src/models/EsiRequest";
import log from "src/tools/Logger";

export default class EsiService {

  constructor(public esiRequestCollection: Collection<EsiRequest>) { }

  async getData<T>({ path }: { path: string }, withData: { (data: T): Promise<void> }) {

      // First, check whether a request is already in progress.
      if (await this._dataIsFresh({ path })) {
        log.info(`Data for path '${path}' is still fresh.`);
        return;
      }

      // "Lock" the EsiRequest collection.
      log.info(`Locking request path '${path}'...`);
      await this._lockRequest({ path });

      try {
        // Lazily (eventually) update the data in the database.
        log.info(`Getting path '${path}'...`);
        const esiResponse = await axios.get<T>(`https://esi.evetech.net/latest${path}`);
        log.info('response:', esiResponse);
        await withData(esiResponse.data);

        // Unlock the EsiRequest collection and store the expiration time.
        log.info(`Storing expiration time for path '${path}'...`);
        await this._setExpiry({ path }, Date.parse(esiResponse.headers.expires as string));
      } finally {

        // Unlock the EsiRequest collection and store the expiration time.
        log.info(`Unlocking request path '${path}'...`);
        await this._unlockRequest({ path });
      }
  }

  async _dataIsFresh({ path }: { path: string }): Promise<boolean> {
    const ongoingRequests = await this.esiRequestCollection.find({ path });
    return ongoingRequests.length > 0 && ongoingRequests[0].expires > Date.now();
  }

  async _lockRequest({ path }: { path: string }): Promise<EsiRequest> {
    return this.esiRequestCollection.updateOne(
      { path },
      { inProgress: true }
    );
  }

  async _setExpiry({ path }: {path: string}, expires: number): Promise<EsiRequest> {
    return this.esiRequestCollection.updateOne(
      { path },
      { expires }
    );
  }

  async _unlockRequest({ path }: { path: string }): Promise<EsiRequest> {
    return this.esiRequestCollection.updateOne(
      { path },
      { inProgress: false }
    );
  }

}
