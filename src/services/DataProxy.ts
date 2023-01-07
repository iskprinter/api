import { Collection } from "src/databases";
import { Group, Type } from "src/models";
import { EsiRequestConfig, EsiService } from "src/services";

export default class DataProxy {
  constructor(
    public esiService: EsiService,
    public groupsCollection: Collection<Group>,
    public typesCollection: Collection<Type>,
  ) { }

  async getMarketGroup(groupId: number): Promise<Group> {
    const esiRequestConfig: EsiRequestConfig<Group, Group> = {
      query: () => this.groupsCollection.findOne({ market_group_id: groupId }),
      path: `/markets/groups/${groupId}`,
      update: async (group) => this.groupsCollection.updateOne({ market_group_id: group.market_group_id }, group)
    };
    const group = await this.esiService.request(esiRequestConfig);
    return group;
  }

  async getMarketGroups(): Promise<Group[]> {
    const esiRequestConfig: EsiRequestConfig<number[], Group[]> = {
      query: async () => this.groupsCollection.find({}),
      path: '/markets/groups',
      update: async (marketGroupIds) => this.groupsCollection.putMany(
        marketGroupIds.map((marketGroupId) => ({ market_group_id: marketGroupId }))
      )
    };
    const groups = await this.esiService.request(esiRequestConfig);
    return groups;
  }

  async getType(typeId: number): Promise<Type> {
    const esiRequestConfig: EsiRequestConfig<Type, Type> = {
      query: () => this.typesCollection.findOne({ type_id: typeId }),
      path: `/universe/types/${typeId}`,
      update: async (type) => this.typesCollection.updateOne({ type_id: type.type_id }, type)
    };
    const type = await this.esiService.request(esiRequestConfig);
    return type;
  }

  async getTypes(): Promise<Type[]> {
    const esiRequestConfig: EsiRequestConfig<number[], Type[]> = {
      query: () => this.typesCollection.find({}),
      path: '/universe/types',
      update: async (typeIds) => this.typesCollection.putMany(
        typeIds.map((typeId) => ({ type_id: typeId }))
      )
    };
    const types = await this.esiService.request(esiRequestConfig);
    return types;
  }
}
