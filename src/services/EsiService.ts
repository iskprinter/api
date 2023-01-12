
import crypto from 'crypto';

import requester from 'src/tools/Requester';
import { Collection } from "src/databases";
import log from "src/tools/Logger";
import { EsiRequest } from 'src/models';
import { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
import { Observable } from 'rxjs';

export default class EsiService {

  constructor(public esiRequestCollection: Collection<EsiRequest>) { }

  update<T>(config: AxiosRequestConfig = {}): Observable<T> {
    return new Observable<T>((subscriber) => {

      const requestId = this._getRequestId(config);
      this._getOngoingRequest(requestId)
        .then((priorRequest) => {

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
            return new Promise((resolve, reject) => {
              this._getAllPages<T>(requestId, config, priorRequest).subscribe({
                next: (data) => subscriber.next(data),
                error: async (err) => {
                  if (err instanceof AxiosError) {
                    await this._handleError(requestId, err);
                    return resolve();
                  }
                  return reject(err);
                },
                complete: () => resolve(),
              });
            });
          }).then(
            () => subscriber.complete(),
            (err) => subscriber.error(err),
          );
        });
    });
  }

  _getAllPages<T>(requestId: string, config: AxiosRequestConfig, priorRequest?: EsiRequest): Observable<T> {
    return new Observable((subscriber) => {

      log.info(`Submitting request for requestId '${requestId}'...`);
      const page = 1;
      this._getPage<T>(config, page, priorRequest)
        .then(async (esiResponse) => {
          subscriber.next(esiResponse.data);
          const maxPages = esiResponse.headers['x-pages'] ? Number(esiResponse.headers['x-pages']) : 1;

          const requestPromises = [];
          for (let page = 2; page <= maxPages; page += 1) {
            requestPromises.push((async () => {
              const esiResponse = await this._getPage<T>(config, page, priorRequest);
              subscriber.next(esiResponse.data);
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
        })
        .then(
          () => subscriber.complete(),
          (err) => subscriber.error(err),
        )

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

  async _handleError(requestId: string, err: AxiosError): Promise<void> {
    switch (err.response?.status) {
      case 304:
        log.info(`Data for request with requestId ${requestId} is unchanged.`);
        await this._updatePriorRequest(requestId, { expires: new Date(String(err.response?.headers.expires)).getTime() });
        break;
      case 502:
        log.warn(err.message);
        break;
      case 503:
        log.warn(err.message);
        break;
      case 504:
        log.warn(err.message);
        break;
      default:
        throw err;
    }
  }

  async _getOngoingRequest(requestId: string): Promise<EsiRequest> {
    return this.esiRequestCollection.findOne({ requestId });
  }

  _requestDataHasExpired(request: EsiRequest) {
    return !request || request.expires < Date.now();
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

  async _withRequestLocked(requestId: string, next: () => Promise<void>): Promise<void> {
    // Lock the EsiRequest document.
    log.info(`Locking request with requestId '${requestId}'...`);
    await this._lockRequest(requestId);
    try {
      await next();
    } finally {
      log.info(`Unlocking request with requestId '${requestId}'...`);
      await this._unlockRequest(requestId);
    }
  }

}
