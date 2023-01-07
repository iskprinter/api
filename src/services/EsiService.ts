import requester from 'src/tools/Requester';
import { Collection } from "src/databases";
import log from "src/tools/Logger";
import { EsiRequest } from 'src/models';
import EsiRequestConfig from './EsiRequestConfig';
import { AxiosError } from 'axios';

export default class EsiService {

  constructor(public esiRequestCollection: Collection<EsiRequest>) { }

  async request<T, R>(esiRequestConfig: EsiRequestConfig<T, R>): Promise<R> {
    const data = await esiRequestConfig.query();
      /* do not await */ this._refreshData(esiRequestConfig);
    return data;
  }

  async _refreshData<T, R>(esiRequestConfig: EsiRequestConfig<T, R>): Promise<void> {
    if (await this.dataIsFresh(esiRequestConfig)) {
      log.info(`Data for request path ${esiRequestConfig.path} is still fresh.`);
      return;
    }
    if (await this.requestIsLocked(esiRequestConfig)) {
      log.info(`Request path ${esiRequestConfig.path} is locked.`);
      return;
    }
    // Lock the EsiRequest document.
    log.info(`Locking request path '${esiRequestConfig.path}'...`);
    await this._lockRequest(esiRequestConfig);
    log.info(`Getting path '${esiRequestConfig.path}'...`);
    try {
      // Get the total number of pages
      const headResponse = await requester.head<T>(`https://esi.evetech.net/latest${esiRequestConfig.path}`, esiRequestConfig.requestConfig);
      let maxPages = headResponse.headers['x-pages'] ? Number(headResponse.headers['x-pages']) : 1;
      const pageRequests = [];
      for (let page = 1; page <= maxPages; page += 1) {
        pageRequests.push((async () => {
          const esiResponse = await requester.get<T>(`https://esi.evetech.net/latest${esiRequestConfig.path}`, {
            ...esiRequestConfig.requestConfig,
            params: { page }
          });
          await this._setExpiry(esiRequestConfig, Date.parse(esiResponse.headers.expires as string));
          log.info(`Storing response data for path '${esiRequestConfig.path}'...`);
          await esiRequestConfig.update(esiResponse.data);
          maxPages = esiResponse.headers['x-pages'] ? Number(esiResponse.headers['x-pages']) : 1;
          page += 1;
        })());
      }
      await Promise.all(pageRequests);
    } catch (err) {
      if (err instanceof AxiosError) {
        if (err.response?.status === 404) {
          log.warn(err.message);
        }
      }
    } finally {
      log.info(`Unlocking request path '${esiRequestConfig.path}'...`);
      await this._unlockRequest(esiRequestConfig);
    }
  }

  async dataIsFresh({ path }: { path: string }): Promise<boolean> {
    const ongoingRequests = await this.esiRequestCollection.find({ path });
    const dataIsFresh = ongoingRequests.length > 0 && ongoingRequests[0].expires > Date.now();
    return dataIsFresh;
  }

  async requestIsLocked({ path }: { path: string }): Promise<boolean> {
    const ongoingRequests = await this.esiRequestCollection.find({ path });
    const requestIsLocked = ongoingRequests.length > 0 && ongoingRequests[0].inProgress;
    return requestIsLocked;
  }

  async _lockRequest({ path }: { path: string }): Promise<EsiRequest> {
    return this.esiRequestCollection.updateOne(
      { path },
      { inProgress: true }
    );
  }

  async _setExpiry({ path }: { path: string }, expires: number): Promise<EsiRequest> {
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
