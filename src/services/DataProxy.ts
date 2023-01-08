import { Collection } from "src/databases";
import { Group, Region, System, Type } from "src/models";
import Constellation from "src/models/Constellation";
import { EsiRequestConfig, EsiService } from "src/services";

export default class DataProxy {
  constructor(
    public constellationsCollection: Collection<Constellation>,
    public esiService: EsiService,
    public groupsCollection: Collection<Group>,
    public regionsCollection: Collection<Region>,
    public systemsCollection: Collection<System>,
    public typesCollection: Collection<Type>,
  ) { }

  async getConstellation(constellationId: number): Promise<Constellation> {
    const esiRequestConfig: EsiRequestConfig<Constellation> = {
      query: async () => (await this.constellationsCollection.findOne({ constellation_id: constellationId})),
      path: `/universe/constellations/${constellationId}`,
      update: async (constellation) => {
        await this.constellationsCollection.updateOne({ constellation_id: constellation.constellation_id }, constellation);
        return constellation;
      }
    };
    const constellation = await this.esiService.request(esiRequestConfig);
    return constellation;
  }

  async getConstellationIds(): Promise<number[]> {
    const esiRequestConfig: EsiRequestConfig<number[]> = {
      query: async () => (await this.constellationsCollection.find({})).map((constellation) => constellation.constellation_id),
      path: '/universe/constellations',
      update: async (constellationIds) => {
        await this.constellationsCollection.putMany(constellationIds.map((constellationId) => ({ constellation_id: constellationId })));
        return constellationIds;
      }
    };
    const constellationIds = await this.esiService.request(esiRequestConfig);
    return constellationIds;
  }

  async getMarketGroup(groupId: number): Promise<Group> {
    const esiRequestConfig: EsiRequestConfig<Group> = {
      query: () => this.groupsCollection.findOne({ market_group_id: groupId }),
      path: `/markets/groups/${groupId}`,
      update: async (group) => this.groupsCollection.updateOne({ market_group_id: group.market_group_id }, group)
    };
    const group = await this.esiService.request(esiRequestConfig);
    return group;
  }

  async getMarketGroupIds(): Promise<number[]> {
    const esiRequestConfig: EsiRequestConfig<number[]> = {
      query: async () => (await this.groupsCollection.find({})).map((group) => group.market_group_id),
      path: '/markets/groups',
      update: async (marketGroupIds) => {
        this.groupsCollection.putMany(marketGroupIds.map((marketGroupId) => ({ market_group_id: marketGroupId })))
        return marketGroupIds;
      }
    };
    const marketGroupIds = await this.esiService.request(esiRequestConfig);
    return marketGroupIds;
  }

  async getRegion(regionId: number): Promise<Region> {
    const esiRequestConfig: EsiRequestConfig<Region> = {
      query: async () => (await this.regionsCollection.findOne({ region_id: regionId})),
      path: `/universe/regions/${regionId}`,
      update: async (region) => {
        await this.regionsCollection.updateOne({ region_id: region.region_id }, region);
        return region;
      }
    };
    const region = await this.esiService.request(esiRequestConfig);
    return region;
  }

  async getRegionIds(): Promise<number[]> {
    const esiRequestConfig: EsiRequestConfig<number[]> = {
      query: async () => (await this.regionsCollection.find({})).map((region) => region.region_id),
      path: '/universe/regions',
      update: async (regionIds) => {
        await this.regionsCollection.putMany(regionIds.map((regionId) => ({ region_id: regionId })));
        return regionIds;
      }
    };
    const regionIds = await this.esiService.request(esiRequestConfig);
    return regionIds;
  }

  async getSystem(systemId: number): Promise<System> {
    const esiRequestConfig: EsiRequestConfig<System> = {
      query: async () => (await this.systemsCollection.findOne({ system_id: systemId})),
      path: `/universe/systems/${systemId}`,
      update: async (system) => {
        await this.systemsCollection.updateOne({ system_id: system.system_id }, system);
        return system;
      }
    };
    const system = await this.esiService.request(esiRequestConfig);
    return system;
  }

  async getSystemIds(): Promise<number[]> {
    const esiRequestConfig: EsiRequestConfig<number[]> = {
      query: async () => (await this.systemsCollection.find({})).map((system) => system.system_id),
      path: '/universe/systems',
      update: async (systemIds) => {
        await this.systemsCollection.putMany(systemIds.map((systemId) => ({ system_id: systemId })));
        return regionIds;
      }
    };
    const regionIds = await this.esiService.request(esiRequestConfig);
    return regionIds;
  }

  async getType(typeId: number): Promise<Type> {
    const esiRequestConfig: EsiRequestConfig<Type> = {
      query: () => this.typesCollection.findOne({ type_id: typeId }),
      path: `/universe/types/${typeId}`,
      update: async (type) => this.typesCollection.updateOne({ type_id: type.type_id }, type)
    };
    const type = await this.esiService.request(esiRequestConfig);
    return type;
  }

  async getTypeIds(): Promise<number[]> {
    const esiRequestConfig: EsiRequestConfig<number[]> = {
      query: async () => (await this.typesCollection.find({})).map((type) => type.type_id),
      path: '/universe/types',
      update: async (typeIds) => {
        await this.typesCollection.putMany(typeIds.map((typeId) => ({ type_id: typeId })));
        return typeIds;
      }
    };
    const typeIds = await this.esiService.request(esiRequestConfig);
    return typeIds;
  }
}
