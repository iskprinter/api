
import crypto from 'crypto';

import requester from 'src/tools/Requester';
import { Collection } from "src/databases";
import log from "src/tools/Logger";
import { EsiRequest, EsiRequestData } from 'src/models';
import { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
import { Subject } from 'src/tools';

export default class EsiService {

  constructor(public esiRequestCollection: Collection<EsiRequestData>) { }

  /**
   * Usage:
   * 
   * await esiService
   *   .update({ ...config })
   *   .subscribe({ next, error, complete });
   */
  update<T>(config: AxiosRequestConfig): Subject<T> {
    return new Subject(async (subscriber) => {

      const requestId = this._getRequestId(config);
      const priorRequest = await this._getRequest(requestId);

      if (!this._requestDataHasExpired(priorRequest)) {
        log.info(`Data for requestId ${requestId} has not expired yet.`);
        return;
      }

      // If the prior request was locked sooner than 1 hour ago, abort.
      if (this._requestIsLocked(priorRequest)) {
        log.info(`Request with requestId ${requestId} was locked sooner than 1 hour ago.`);
        return;
      }

      return this._withRequestLocked(requestId, async () => {
        return this._getAllPages<T>(requestId, config, priorRequest).subscribe({
          next: (data) => subscriber.next(data),
          error: async (err) => {
            if (err instanceof AxiosError) {
              switch (err.response?.status) {
                case 304:
                  log.info(`Data for request with requestId ${requestId} is unchanged.`);
                  return this._updatePriorRequest(requestId, { expires: new Date(String(err.response?.headers.expires)).getTime() });
                case 502:
                  log.warn(err.message);
                  return;
                case 503:
                  log.warn(err.message);
                  return;
                case 504:
                  log.warn(err.message);
                  return;
              }
            }
            return subscriber.error?.(err);
          },
        });
      });

    });
  }

  _getAllPages<T>(requestId: string, config: AxiosRequestConfig, priorRequest?: EsiRequest): Subject<T> {
    return new Subject(async (subscriber) => {
      try {

        log.info(`Submitting request for requestId '${requestId}'...`);
        const page = 1;
        const esiResponse = await this._getPage<T>(config, page, priorRequest);
        await subscriber.next(esiResponse.data);
        const maxPages = esiResponse.headers['x-pages'] ? Number(esiResponse.headers['x-pages']) : 1;

        const requestPromises = [];
        for (let page = 2; page <= maxPages; page += 1) {
          requestPromises.push((async () => {
            const esiResponse = await this._getPage<T>(config, page, priorRequest);
            await subscriber.next(esiResponse.data);
          })());
        }
        await Promise.all(requestPromises);

        await this._updatePriorRequest(requestId, {
          method: config.method,
          url: config.url,
          expires: new Date(String(esiResponse.headers.expires)).getTime(),
          etag: esiResponse.headers.etag as string,
          ...(config.headers?.authorization ? { authorization: config.headers.authorization } : {}),
          ...(config.params ? { params: config.params } : {}),
        });

        return subscriber.complete?.();
      } catch (err) {
        await subscriber.error?.(err);
      }

    });
  }

  async _getPage<T>(config: AxiosRequestConfig, page: number, priorRequest?: EsiRequest): Promise<AxiosResponse<T>> {
    return requester.request<T>({
      ...config,
      headers: {
        ...config.headers,
        ...(priorRequest?.etag && { 'if-none-match': priorRequest.etag })
      },
      params: {
        ...config.params,
        page
      },
      baseURL: `https://esi.evetech.net/latest`,
    });
  }

  async _getRequest(requestId: string): Promise<EsiRequestData> {
    const esiRequestData = await this.esiRequestCollection.findOne({ requestId });
    return esiRequestData;
  }

  _requestDataHasExpired(request: EsiRequest) {
    return !request || !request.expires || request.expires < Date.now();
  }

  _requestIsLocked(request: EsiRequest) {
    return request && request.locked > (Date.now() - 1000 * 60 * 60);
  }

  _getRequestId(config: AxiosRequestConfig): string {
    const requestProperties = [
      config.method,
      config.url,
      ...(config.headers?.authorization ? [config.headers.authorization] : []),
      ...(config.params ? [new URLSearchParams(config.params).toString()] : []),
    ];
    const requestId = crypto.createHash('md5')
      .update(requestProperties.join('|'))
      .digest('hex');
    return requestId;
  }

  async _lockRequest(requestId: string): Promise<EsiRequest> {
    return this.esiRequestCollection.updateOne(
      { requestId },
      { locked: Date.now() }
    );
  }

  async _updatePriorRequest(requestId: string, request: Partial<EsiRequest>): Promise<EsiRequest> {
    return this.esiRequestCollection.updateOne(
      { requestId },
      request
    );
  }

  async _unlockRequest(requestId: string): Promise<EsiRequest> {
    return this.esiRequestCollection.updateOne(
      { requestId },
      { locked: 0 }
    );
  }

  async _withRequestLocked<T>(requestId: string, next: () => Promise<T>): Promise<T> {
    // Lock the EsiRequest document.
    log.info(`Locking request with requestId '${requestId}'...`);
    await this._lockRequest(requestId);
    try {
      return next();
    } finally {
      log.info(`Unlocking request with requestId '${requestId}'...`);
      await this._unlockRequest(requestId);
    }
  }

}
