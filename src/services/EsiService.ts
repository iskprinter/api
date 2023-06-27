
import crypto from 'crypto';

import requester from 'src/tools/Requester';
import { Collection } from "src/databases";
import log from "src/tools/log";
import { CharacterData, CharacterLocationData, ConstellationData, EsiRequest, EsiRequestData, MarketGroupData, OrderData, RegionData, SkillData, StationData, StructureData, SystemData, TransactionData, TypeData } from 'src/models';
import { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
import { ServiceUnavailableError, TooManyRequestsError } from 'src/errors';

interface QueuedRequest {
  request: () => Promise<any>;
  resolve: (data: any) => void;
  reject: (err: unknown) => void;
}

export default class EsiService {

  requestQueue: QueuedRequest[] = [];
  activeRequestCount = 0;
  maxRequestCount = 64; // Same as the axios agent max sockets in src/tools/Requester

  constructor(
    public esiRequestCollection: Collection<EsiRequestData>
  ) { }

  async getCharacter(characterId: number): Promise<CharacterData> {
    const characterData = await this._request<CharacterData>({
      method: 'get',
      url: `/v5/characters/${characterId}`,
    });
    return {
      ...characterData,
      character_id: characterId,
    }
  }

  async getCharacterLocation(eveAccessToken: string, characterId: number): Promise<CharacterLocationData> {
    return this._request<CharacterLocationData>({
      headers: {
        authorization: `Bearer ${eveAccessToken}`,
      },
      method: 'get',
      url: `/v2/characters/${characterId}/location`,
    });
  }


  async getCharactersActiveOrders(eveAccessToken: string, characterId: number): Promise<OrderData[]> {
    return this._request<OrderData[]>({
      headers: {
        authorization: `Bearer ${eveAccessToken}`,
      },
      method: 'get',
      url: `/v2/characters/${characterId}/orders`,
    });
  }

  async getCharactersHistoricalOrders(eveAccessToken: string, characterId: number): Promise<OrderData[]> {
    return this._request<OrderData[]>({
      headers: {
        authorization: `Bearer ${eveAccessToken}`,
      },
      method: 'get',
      url: `/v1/characters/${characterId}/orders/history`,
    });
  }

  async getCharactersSkills(eveAccessToken: string, characterId: number): Promise<{ skills: SkillData[], total_sp: number, unallocated_sp: number }> {
    return this._request<{ skills: SkillData[], total_sp: number, unallocated_sp: number }>({
      headers: {
        authorization: `Bearer ${eveAccessToken}`,
      },
      method: 'get',
      url: `/v4/characters/${characterId}/skills`,
    });
  }

  async getCharactersWallet(eveAccessToken: string, characterId: number): Promise<number> {
    return this._request<number>({
      headers: {
        authorization: `Bearer ${eveAccessToken}`,
      },
      method: 'get',
      url: `/v1/characters/${characterId}/wallet`,
    });
  }

  async getCharactersWalletTransactions(eveAccessToken: string, characterId: number): Promise<TransactionData[]> {
    return this._request<TransactionData[]>({
      headers: {
        authorization: `Bearer ${eveAccessToken}`,
      },
      method: 'get',
      url: `/v1/characters/${characterId}/wallet/transactions`,
    });
  }

  async getConstellation(constellationId: number): Promise<ConstellationData> {
    return this._request<ConstellationData>({
      method: 'get',
      url: `/v1/universe/constellations/${constellationId}`
    });
  }

  async getConstellations({ regionId }: { regionId?: number } = {}): Promise<ConstellationData[]> {
    const constellationIds = await (async () => {
      if (regionId) {
        const region = await this.getRegion(regionId);
        return region.constellations;
      }
      return await this._request<number[]>({
        method: 'get',
        url: '/v1/universe/constellations'
      });
    })();
    const constellations = await Promise.all(constellationIds.map((constellationId) => this.getConstellation(constellationId)));
    return constellations;
  }

  async getMarketGroup(marketGroupId: number): Promise<MarketGroupData> {
    return this._request<MarketGroupData>({
      method: 'get',
      url: `/v1/markets/groups/${marketGroupId}`
    });
  }

  async getMarketGroups(): Promise<MarketGroupData[]> {
    const marketGroupIds = await this._request<number[]>({
      method: 'get',
      url: '/v1/markets/groups'
    });
    const marketGroups = await Promise.all(marketGroupIds.map((marketGroupId) => this.getMarketGroup(marketGroupId)));
    return marketGroups;
  }

  async getMarketOrders(regionId: number): Promise<OrderData[]> {
    return this._request<OrderData[]>({
      method: 'get',
      url: `/v1/markets/${regionId}/orders/`
    });
  }

  async getMarketTypes(): Promise<TypeData[]> {
    const marketGroups = await this.getMarketGroups();
    const marketTypeIds = marketGroups.reduce((marketTypeIds: number[], marketGroup) => [...marketTypeIds, ...marketGroup.types], []);
    const marketTypes = await Promise.all(marketTypeIds.map((marketTypeId) => this.getType(marketTypeId)));
    return marketTypes;
  }

  async getRegion(regionId: number): Promise<RegionData> {
    return this._request<RegionData>({
      method: 'get',
      url: `/v1/universe/regions/${regionId}`
    });
  }

  async getRegions(): Promise<RegionData[]> {
    const regionIds = await this._request<number[]>({
      method: 'get',
      url: '/v1/universe/regions'
    });
    const regions = await Promise.all(regionIds.map((regionId) => this.getRegion(regionId)));
    return regions;
  }

  async getStation(stationId: number): Promise<StationData> {
    return this._request<StationData>({
      method: 'get',
      url: `/v2/universe/stations/${stationId}`
    });
  }

  async getStations({ systemId }: { systemId: number }): Promise<StationData[]> {
    const system = await this._request<SystemData>({
      method: 'get',
      url: `/v4/universe/systems/${systemId}`
    });
    const stationIds = system.stations;
    if (!stationIds) {
      return [];
    }
    const stations = await Promise.all(stationIds.map((stationId) => this.getStation(stationId)));
    return stations;
  }

  async getStructure(eveAccessToken: string, structureId: number): Promise<StructureData> {
    const structure = await this._request<StructureData>({
      headers: {
        authorization: `Bearer ${eveAccessToken}`,
      },
      method: 'get',
      url: `/v2/universe/structures/${structureId}`,
    });
    return {
      ...structure,
      structure_id: structureId,
    }
  }

  async getStructureOrders(eveAccessToken: string, structureId: number): Promise<OrderData[]> {
    return this._request<OrderData[]>({
      headers: {
        authorization: `Bearer ${eveAccessToken}`,
      },
      method: 'get',
      url: `/v1/markets/structures/${structureId}`,
    });
  }

  async getStructures(eveAccessToken: string, { systemId }: { systemId: number }): Promise<StructureData[]> {
    const structureIds = await this._request<number[]>({
      method: 'get',
      url: '/v1/universe/structures'
    });
    const structures = (await Promise.all(structureIds.map(async (structureId) => {
      try {
        const structure = await this.getStructure(eveAccessToken, structureId);
        return {
          ...structure,
          structure_id: structureId,
        }
      } catch (err) {
        // Handle the situation in which the '/v1/universe/structures' returns a structureId for a structure that is not actually public
        if (err instanceof AxiosError) {
          switch (err.response?.status) {
            case 403:
              return undefined
            default:
              throw err;
          }
        }
        throw err;
      }
    })))
      .filter((structure) => structure !== undefined) as StructureData[];
    return structures.filter((structure) => structure.solar_system_id === systemId);
  }

  async getSystems({ regionId }: { regionId: number }): Promise<SystemData[]> {
    const region = await this._request<RegionData>({
      method: 'get',
      url: `/v1/universe/regions/${regionId}`
    });
    const constellationIds = region.constellations;
    const constellations = await Promise.all(constellationIds.map((constellationId) => {
      return this._request<ConstellationData>({
        method: 'get',
        url: `/v1/universe/constellations/${constellationId}`
      });
    }));
    const systemIds = constellations.reduce((systemIds: number[], constellation) => [...systemIds, ...(constellation.systems || [])], []);
    const systems = await Promise.all(systemIds.map(async (systemId) => {
      return this._request<SystemData>({
        method: 'get',
        url: `/v4/universe/systems/${systemId}`
      });
    }));
    return systems;
  }

  async getType(typeId: number): Promise<TypeData> {
    const type = await this._request<TypeData>({
      method: 'get',
      url: `/v3/universe/types/${typeId}`,
    });
    return type;
  }

  async executeQueuedRequests() {
    while (this.activeRequestCount < this.maxRequestCount && this.requestQueue.length > 0) {
      this.activeRequestCount += 1;
      const { request, resolve, reject } = this.requestQueue.pop() as QueuedRequest
      try {
        const res = await request();
        resolve(res);
      } catch (err) {
        reject(err);
      } finally {
        this.activeRequestCount -= 1;
      }
    }
  }

  async queueRequest<T>(request: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      if (this.activeRequestCount < this.maxRequestCount) {
        this.activeRequestCount += 1;
        request()
          .then(resolve, reject)
          .finally(() => {
            this.activeRequestCount -= 1;
            this.executeQueuedRequests();
          });
      } else {
        this.requestQueue.push({ request, resolve, reject });
      }
    });
  }

  async _request<T>(config: AxiosRequestConfig): Promise<T> {

    const firstPageResponse = await this.queueRequest(() => this._getPage<T>(config));
    const totalPages = firstPageResponse.headers['x-pages'] ? Number(firstPageResponse.headers['x-pages']) : 1;
    if (totalPages === 1) {
      return firstPageResponse.data;
    }
    const requests = [];
    for (let page = 2; page <= totalPages; page += 1) {
      requests.push(async () => {
        return this._getPage<T>(config, page);
      });
    }
    const responses = await Promise.all(requests.map(async (request) => this.queueRequest(request)));

    const responseData = [firstPageResponse, ...responses]
      .map((response) => response.data as unknown[])
      .reduce((d1, d2) => [...d1, ...d2], []);
    return responseData as T;
  }

  async _getPage<T>(config: AxiosRequestConfig, page?: number): Promise<AxiosResponse<T>> {
    const configForUniqueRequestId = {
      ...config, // Includes method and url
      baseURL: `https://esi.evetech.net`,
      headers: {
        ...config?.headers,
      },
      params: {
        ...config?.params,
        ...(page ? { page } : {}),
      }
    };

    // Retrieve the cached request from the database
    const requestId = this._getRequestId(configForUniqueRequestId);
    const priorRequest = await this._getRequest(requestId);
    const completeConfig = {
      ...configForUniqueRequestId,
      headers: {
        ...configForUniqueRequestId.headers,
        ...(priorRequest?.etag && { 'if-none-match': priorRequest.etag }),
        'user-agent': 'agent=axios; contact=Kronn8',
      }
    };

    if (!this._requestDataHasExpired(priorRequest)) {
      log.info(`Data for requestId ${requestId} has not expired yet.`);
      return priorRequest.response as AxiosResponse<T>;
    }

    await this._withExponentialBackoff(
      () => {
        if (!this._requestIsLocked(priorRequest)) {
          return;
        }
        throw new TooManyRequestsError();
      },
      (err) => {
        if (err instanceof TooManyRequestsError) {
          // Do nothing
        }
        throw err;
      },
      () => { throw new TooManyRequestsError(); }
    )

    const response = await this._withRequestLocked(requestId, async () => {
      try {
        const response = await this._retryOnServerError(() => {
          return requester.request<T>(completeConfig);
        });
        await this._updatePriorRequest(requestId, {
          expires: new Date(String(response.headers.expires)).getTime(),
          response: {
            data: response.data,
            headers: response.headers,
            status: response.status,
            statusText: response.statusText,
          }
        });
        return response;
      } catch (err) {
        if (err instanceof AxiosError) {
          switch (err.response?.status) {
            case 304:
              log.info(`Data for request with requestId ${requestId} is unchanged.`);
              await this._updatePriorRequest(requestId, {
                expires: new Date(String(err.response?.headers.expires)).getTime()
              });
              break;
            default:
              throw err;
          }
        }
        throw err;
      }
    });
    return response;
  }

  async _getRequest(requestId: string): Promise<EsiRequestData> {
    const esiRequestData = await this.esiRequestCollection.findOne({ requestId });
    return esiRequestData;
  }


  _getRequestId(config: AxiosRequestConfig): string {
    const requestId = crypto.createHash('md5')
      .update(JSON.stringify(config))
      .digest('hex');
    return requestId;
  }

  async _lockRequest(requestId: string): Promise<EsiRequest> {
    return this.esiRequestCollection.updateOne(
      { requestId },
      { locked: Date.now() }
    );
  }

  _requestDataHasExpired(request: EsiRequest) {
    return !request || !request.expires || request.expires < Date.now();
  }

  _requestIsLocked(request: EsiRequest) {
    return request && request.locked > (Date.now() - 1000 * 60);
  }

  async _retryOnServerError<T>(request: () => Promise<AxiosResponse<T>>): Promise<AxiosResponse<T>> {
    return this._withExponentialBackoff(
      async () => await request(),
      (err: unknown) => {
        if (!(err instanceof AxiosError)) {
          throw err;
        }
        if (!err.response) {
          throw err;
        }
        if (![502, 503, 504].includes(err.response.status)) {
          throw err;
        }
      },
      () => { throw new ServiceUnavailableError('ESI appears to be down.'); }
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

  async _withExponentialBackoff<T>(
    request: () => T | Promise<T>,
    onError: (err: unknown) => unknown | Promise<unknown>,
    otherwise: () => Promise<T>,
    { maxAttempts = 3, initialDelay = 50 /* ms */, expBackoff = 2 } = {},
  ): Promise<T> {
    const delay = (attempt: number): number => {
      return Math.random() * initialDelay * (expBackoff ** attempt) / 2
    };
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      try {
        return await request();
      } catch (err) {
        await onError(err);
        await new Promise((resolve) => setTimeout(resolve, delay(attempt)));
      }
    }
    return await otherwise();
  }

  async _withRequestLocked<T>(requestId: string, next: () => Promise<T>): Promise<T> {
    // Lock the EsiRequest document.
    log.info(`Locking request with requestId '${requestId}'...`);
    await this._lockRequest(requestId);
    try {
      return await next();
    } finally {
      log.info(`Unlocking request with requestId '${requestId}'...`);
      await this._unlockRequest(requestId);
    }
  }

}
