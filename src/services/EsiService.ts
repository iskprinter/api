import requester from 'src/tools/Requester';
import { Collection } from "src/databases";
import log from "src/tools/Logger";
import { EsiRequest } from 'src/models';
import EsiRequestConfig from './EsiRequestConfig';
import { AxiosError } from 'axios';

export default class EsiService {

  constructor(public esiRequestCollection: Collection<EsiRequest>) { }

  async request<T>(esiRequestConfig: EsiRequestConfig<T>): Promise<T> {
    const data = await esiRequestConfig.query();
      /* do not await */ this._refreshData(esiRequestConfig);
    return data;
  }

  async _refreshData<T>(esiRequestConfig: EsiRequestConfig<T>): Promise<void> {
    const priorRequest = await this._getOngoingRequest(esiRequestConfig);

    if (priorRequest && priorRequest.expires > Date.now()) {
      log.info(`Data for request path ${esiRequestConfig.path} has not expired yet.`);
      return;
    }

    if (priorRequest && priorRequest.inProgress) {
      log.info(`Request path ${esiRequestConfig.path} is locked.`);
      return;
    }

    // Submit a head request to check the etag, update the expiration, and get the number of pages.
    const headRequestConfig = esiRequestConfig.requestConfig || {};
    if (priorRequest && priorRequest.etag) {
      if (!headRequestConfig.headers) {
        headRequestConfig.headers = {};
      }
      headRequestConfig.headers['if-none-match'] = priorRequest.etag
    }
    const headResponse = await requester.head<T>(`https://esi.evetech.net/latest${esiRequestConfig.path}`, headRequestConfig);
    if (headResponse.status === 304) {
      log.info(`Data for request path ${esiRequestConfig.path} is unchanged.`);
      await this._setExpiryAndEtag(esiRequestConfig, {
        expires: headResponse.headers.expires as string,
      });
      return;
    }
    let maxPages = headResponse.headers['x-pages'] ? Number(headResponse.headers['x-pages']) : 1;

    // Lock the EsiRequest document.
    log.info(`Locking request path '${esiRequestConfig.path}'...`);
    await this._lockRequest(esiRequestConfig);
    log.info(`Getting path '${esiRequestConfig.path}'...`);

    try {
      const pageRequests = [];
      for (let page = 1; page <= maxPages; page += 1) {
        pageRequests.push((async () => {
          const esiResponse = await requester.get<T>(`https://esi.evetech.net/latest${esiRequestConfig.path}`, {
            ...esiRequestConfig.requestConfig,
            params: { page }
          });
          log.info(`Storing response data for path '${esiRequestConfig.path}'...`);
          await esiRequestConfig.update(esiResponse.data);
          maxPages = esiResponse.headers['x-pages'] ? Number(esiResponse.headers['x-pages']) : 1;
          page += 1;
        })());
      }
      await Promise.all(pageRequests);
      await this._setExpiryAndEtag(esiRequestConfig, {
        expires: headResponse.headers.expires as string,
        etag: headResponse.headers.etag as string,
      });
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

  async _getOngoingRequest({ path }: { path: string }): Promise<EsiRequest> {
    return this.esiRequestCollection.findOne({ path });
  }

  async _lockRequest({ path }: { path: string }): Promise<EsiRequest> {
    return this.esiRequestCollection.updateOne(
      { path },
      { inProgress: true }
    );
  }

  async _setExpiryAndEtag({ path }: { path: string }, { etag, expires }: { expires?: string, etag?: string }): Promise<EsiRequest> {
    const updatedRequest: { expires?: number, etag?: string }  = {};
    if (etag) {
      updatedRequest.etag = etag;
    }
    if (expires) {
      updatedRequest.expires = Date.parse(expires);
    }
    return this.esiRequestCollection.updateOne(
      { path },
      updatedRequest
    );
  }

  async _unlockRequest({ path }: { path: string }): Promise<EsiRequest> {
    return this.esiRequestCollection.updateOne(
      { path },
      { inProgress: false }
    );
  }

}
