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

    // Lock the EsiRequest document.
    log.info(`Locking request path '${esiRequestConfig.path}'...`);
    await this._lockRequest(esiRequestConfig);
    log.info(`Getting path '${esiRequestConfig.path}'...`);

    try {
      const esiResponse = await requester.get<T>(`https://esi.evetech.net/latest${esiRequestConfig.path}`, {
        ...esiRequestConfig.requestConfig,
        headers: {
          ...esiRequestConfig.requestConfig?.headers,
          'if-none-match': priorRequest.etag,
        },
        params: { page: 1 }
      });
      if (esiResponse.status === 304) {
        log.info(`Data for request path ${esiRequestConfig.path} is unchanged.`);
        await this._setExpiryAndEtag(esiRequestConfig, {
          expires: esiResponse.headers.expires as string,
        });
        return;
      }

      log.info(`Storing response data for path '${esiRequestConfig.path}' page 1...`);
      await esiRequestConfig.update(esiResponse.data);
      const maxPages = esiResponse.headers['x-pages'] ? Number(esiResponse.headers['x-pages']) : 1;

      const requestPromises = [];
      for (let page = 2; page <= maxPages; page += 1) {
        requestPromises.push((async () => {
          const esiResponse = await requester.get<T>(`https://esi.evetech.net/latest${esiRequestConfig.path}`, {
            ...esiRequestConfig.requestConfig,
            params: { page }
          });
          log.info(`Storing response data for path '${esiRequestConfig.path}' page ${page}...`);
          await esiRequestConfig.update(esiResponse.data);
        })());
      }
      await Promise.all(requestPromises);
      await this._setExpiryAndEtag(esiRequestConfig, {
        expires: esiResponse.headers.expires as string,
        etag: esiResponse.headers.etag as string,
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
