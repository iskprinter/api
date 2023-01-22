import { AxiosError } from "axios";
import { Collection } from "src/databases";
import {
  Character,
  CharacterData,
  Constellation,
  ConstellationData,
  Deal,
  Group,
  GroupData,
  Order,
  OrderData,
  Region,
  RegionData,
  Skills,
  Station,
  StationData,
  Structure,
  StructureData,
  System,
  SystemData,
  Type,
  TypeData
} from "src/models";
import { DealFinder, InventoryTimesMarginStrategy } from "./DealFinder";
import EsiService from "./EsiService";
import log from 'src/tools/Logger';

export default class DataProxy {
  constructor(
    public esiService: EsiService,
    public charactersCollection: Collection<CharacterData>,
    public constellationsCollection: Collection<ConstellationData>,
    public groupsCollection: Collection<GroupData>,
    public ordersCollection: Collection<OrderData>,
    public regionsCollection: Collection<RegionData>,
    public stationsCollection: Collection<StationData>,
    public structuresCollection: Collection<StructureData>,
    public systemsCollection: Collection<SystemData>,
    public typesCollection: Collection<TypeData>,
  ) { }

  async getCharacters(query: object = {}): Promise<Character[]> {
    const characterData = await this.charactersCollection.find(query);
    const characters = characterData.map((characterDatum) => new Character(this, characterDatum));
    return characters;
  }

  async getConstellations(query: object = {}): Promise<Constellation[]> {
    const constellationData = await this.constellationsCollection.find(query);
    const constellations = constellationData.map((constellationDatum) => new Constellation(this, constellationDatum));
    return constellations;
  }

  async getDeals(character: Character, regionId: number, { structureId }: { structureId?: number } = {}): Promise<Deal[]> {

    // Get the character's open market orders
    // this.ordersCollection.find({ characterId });

    // Get the set of marketable types
    const typeIds = (await this.groupsCollection.find({}))
      .filter((group) => group.market_group_id !== 2 && group.parent_group_id !== 2) // Blueprints and reactions
      .filter((group) => group.market_group_id !== 150 && group.parent_group_id !== 150) // Skill books
      .reduce((typeIds: number[], group) => [...typeIds, ...(group.types || [])], []);

    const orderData: OrderData[] = await this.ordersCollection.find({ $or: [
      { region_id: regionId },
      ...(structureId ? [{ structure_id: structureId }] : []),
    ]});
    const orders = orderData.map((orderDatum) => new Order(this, orderDatum));

    const typeData: TypeData[] = await this.typesCollection.find({ type_id: { $in: typeIds } });
    const types = typeData.map((typeDatum) => new Type(this, typeDatum));

    // Compute deals
    const strategy = new InventoryTimesMarginStrategy(character, this, types, orders);
    const dealFinder = new DealFinder(strategy);
    const deals: Deal[] = dealFinder.getDeals();
    return deals;
  }

  async getGroups(): Promise<Group[]> {
    const groupData = await this.groupsCollection.find({});
    return groupData.map((groupDatum) => new Group(this, groupDatum));
  }

  async getOrders(): Promise<Order[]> {
    const orderData = await this.ordersCollection.find({});
    const orders = orderData.map((orderDatum) => new Order(this, orderDatum));
    return orders;
  }

  async getRegions(query: object = {}): Promise<Region[]> {
    const regionData = await this.regionsCollection.find(query);
    const regions = regionData.map((regionDatum) => new Region(this, regionDatum));
    return regions;
  }

  async getStations({ regionId, constellationId, systemId, stationId }: { regionId?: number, constellationId?: number, systemId?: number, stationId?: number }): Promise<Station[]> {
    if (stationId) {
      const stationData = await this.stationsCollection.find({ station_id: stationId });
      const stations = stationData.map((stationDatum) => new Station(this, stationDatum));
      return stations;
    }
    if (systemId) {
      const stationData = await this.stationsCollection.find({ system_id: systemId });
      const stations = stationData.map((stationDatum) => new Station(this, stationDatum));
      return stations;
    }
    if (constellationId) {
      const constellations = await this.constellationsCollection.find({ constellation_id: constellationId });
      const systemIds = constellations.reduce((systemIds: number[], constellation) => [...systemIds, ...(constellation.systems || [])], []);
      const stationData = await this.stationsCollection.find({ system_id: { $in: systemIds } });
      const stations = stationData.map((stationDatum) => new Station(this, stationDatum));
      return stations;
    }
    if (regionId) {
      const constellations = await this.constellationsCollection.find({ region_id: regionId });
      const systemIds = constellations.reduce((systemIds: number[], constellation) => [...systemIds, ...(constellation.systems || [])], []);
      const stationData = await this.stationsCollection.find({ system_id: { $in: systemIds } });
      const stations = stationData.map((stationDatum) => new Station(this, stationDatum));
      return stations;
    }
    const stationData = await this.stationsCollection.find({});
    const stations = stationData.map((stationDatum) => new Station(this, stationDatum));
    return stations;
  }

  async getStructures({ regionId, constellationId, systemId, structureId }: { regionId?: number, constellationId?: number, systemId?: number, structureId?: number }): Promise<Structure[]> {
    if (structureId) {
      const structureData = await this.structuresCollection.find({ structure_id: structureId });
      const structures = structureData.map((structureDatum) => new Structure(this, structureDatum));
      return structures;
    }
    if (systemId) {
      const structureData = await this.structuresCollection.find({ solar_system_id: systemId });
      const structures = structureData.map((structureDatum) => new Structure(this, structureDatum));
      return structures;
    }
    if (constellationId) {
      const constellations = await this.constellationsCollection.find({ constellation_id: constellationId });
      const systemIds = constellations.reduce((systemIds: number[], constellation) => [...systemIds, ...(constellation.systems || [])], []);
      const structureData = await this.structuresCollection.find({ solar_system_id: { $in: systemIds } });
      const structures = structureData.map((structureDatum) => new Structure(this, structureDatum));
      return structures;
    }
    if (regionId) {
      const constellations = await this.constellationsCollection.find({ region_id: regionId });
      const systemIds = constellations.reduce((systemIds: number[], constellation) => [...systemIds, ...(constellation.systems || [])], []);
      const structureData = await this.structuresCollection.find({ solar_system_id: { $in: systemIds } });
      const structures = structureData.map((structureDatum) => new Structure(this, structureDatum));
      return structures;
    }
    const structureData = await this.structuresCollection.find({});
    const structures = structureData.map((structureDatum) => new Structure(this, structureDatum));
    return structures;
  }

  async getSystems({ regionId, constellationId }: { regionId?: number, constellationId?: number }): Promise<System[]> {
    if (constellationId) {
      const constellations = await this.constellationsCollection.find({ constelation_id: constellationId });
      const systemIds = constellations.reduce((systemIds: number[], constellation) => [...systemIds, ...(constellation.systems || [])], []);
      const systemData = await this.systemsCollection.find({ system_id: { $in: systemIds } });
      const systems = systemData.map((systemDatum) => new System(this, systemDatum));
      return systems;
    }
    if (regionId) {
      const constellations = await this.constellationsCollection.find({ region_id: regionId });
      const systemIds = constellations.reduce((systemIds: number[], constellation) => [...systemIds, ...(constellation.systems || [])], []);
      const systemData = await this.systemsCollection.find({ system_id: { $in: systemIds } });
      const systems = systemData.map((systemDatum) => new System(this, systemDatum));
      return systems;
    }
    const systemData = await this.systemsCollection.find({});
    const systems = systemData.map((systemDatum) => new System(this, systemDatum));
    return systems;
  }

  async updateCharacters(characterId: number, authorization: string) {
    await Promise.all([
      this.esiService.update<Character>({
        method: 'get',
        url: `/characters/${characterId}`
      }).subscribe({
        next: (character) => {
          return this.charactersCollection.updateOne({ character_id: characterId }, character);
        }
      }),
      this.esiService.update<Skills>({
        method: 'get',
        url: `/characters/${characterId}/skills`,
        headers: { authorization }
      }).subscribe({
        next: (skills) => {
          return this.charactersCollection.updateOne({ character_id: characterId }, { skills });
        }
      }),
    ]);
  }

  async updateConstellations() {
    let constellationIdsHaveChanged = false;
    let newestConstellationIds: number[] = [];
    await this.esiService.update<number[]>({
      method: 'get',
      url: '/universe/constellations'
    }).subscribe({
      next: (constellationIds) => {
        constellationIdsHaveChanged = true;
        newestConstellationIds = newestConstellationIds.concat(constellationIds);
        return this.constellationsCollection.putMany(constellationIds.map((constellationId) => ({ constellation_id: constellationId })));
      }
    });
    if (constellationIdsHaveChanged) {
      await this.constellationsCollection.delete({ constellation_id: { $nin: newestConstellationIds  } });
    }

    const constellations = await this.constellationsCollection.find({}, { projection: { constellation_id: 1 } });
    return Promise.all(constellations.map((constellation) => {
      return this.esiService.update<Constellation>({
        method: 'get',
        url: `/universe/constellations/${constellation.constellation_id}`
      }).subscribe({
        next: (c) => {
          return this.constellationsCollection.updateOne({ constellation_id: constellation.constellation_id }, c);
        }
      });
    }));
  }

  async updateMarketGroups() {
    let groupIdsHaveChanged = false;
    let newestGroupIds: number[] = [];
    await this.esiService.update<number[]>({
      method: 'get',
      url: '/market/groups'
    }).subscribe({
      next: (groupIds) => {
        groupIdsHaveChanged = true;
        newestGroupIds = newestGroupIds.concat(groupIds);
        return this.groupsCollection.putMany(groupIds.map((groupId) => ({ market_group_id: groupId })));
      }
    });
    if (groupIdsHaveChanged) {
      await this.groupsCollection.delete({ market_group_id: { $nin: newestGroupIds  } });
    }

    const groups = await this.groupsCollection.find({}, { projection: { market_group_id: 1 } });
    return Promise.all(groups.map((group) => {
      return this.esiService.update<Group>({
        method: 'get',
        url: `/market/groups/${group.market_group_id}`
      }).subscribe({
        next: (g) => {
          return this.groupsCollection.updateOne({ market_group_id: group.market_group_id }, g);
        }
      });
    }));
  }

  async updateMarketOrders(regionId: number, orderType: string) {
    let ordersIdsHaveChanged = false;
    let newestOrderIds: number[] = [];
    await this.esiService.update<Order[]>({
      method: 'get',
      url: `/markets/${regionId}/orders`,
      params: { order_type: orderType }
    }).subscribe({
      next: (orders) => {
        ordersIdsHaveChanged = true;
        newestOrderIds = newestOrderIds.concat(orders.map((order) => order.order_id));
        return this.ordersCollection.putMany(orders.map((order) => ({ ...order, region_id: regionId })));
      }
    });
    if (ordersIdsHaveChanged) {
      await this.ordersCollection.delete({ region_id: regionId, order_id: { $nin: newestOrderIds  } });
    }
  }

  async updateRegions() {
    let regionIdsHaveChanged = false;
    let newestRegionIds: number[] = [];
    await this.esiService.update<number[]>({
      method: 'get',
      url: '/universe/regions'
    }).subscribe({
      next: async (regionIds) => {
        regionIdsHaveChanged = true;
        newestRegionIds = newestRegionIds.concat(regionIds);
        return this.regionsCollection.putMany(regionIds.map((regionId) => ({ region_id: regionId })));
      }
    });
    if (regionIdsHaveChanged) {
      await this.regionsCollection.delete({ region_id: { $nin: newestRegionIds  } });
    }

    const regions = await this.regionsCollection.find({}, { projection: { region_id: 1 } });
    return Promise.all(regions.map((region) => {
      return this.esiService.update<Region>({
        method: 'get',
        url: `/universe/regions/${region.region_id}`
      }).subscribe({
        next: (r) => {
          this.regionsCollection.updateOne({ region_id: region.region_id }, r);
        }
      });
    }));
  }

  async updateStations() {
    await this.updateSystems();
    const systems = await this.systemsCollection.find({}, { projection: { stations: 1 } });
    const stationIds = systems.reduce((stationIds: number[], system) => [...stationIds, ...(system.stations || [])], [])
    await this.stationsCollection.delete({ station_id: { $nin: stationIds } });
    return Promise.all(stationIds.map((stationId) => {
      return this.esiService.update<Station>({
        method: 'get',
        url: `/universe/stations/${stationId}`
      }).subscribe({
        next: (s) => {
          return this.stationsCollection.updateOne({ station_id: stationId }, s);
        }
      });
    }));
  }

  async updateStructureOrders(structureId: number, authorization: string) {
    let ordersIdsHaveChanged = false;
    let newestOrderIds: number[] = [];
    await this.esiService.update<Order[]>({
      method: 'get',
      url: `/markets/structures/${structureId}`,
      headers: { authorization }
    }).subscribe({
      next: (orders) => {
        ordersIdsHaveChanged = true;
        newestOrderIds = newestOrderIds.concat(orders.map((order) => order.order_id));
        return this.ordersCollection.putMany(orders.map((order) => ({ ...order, structure_id: structureId })));
      }
    });
    if (ordersIdsHaveChanged) {
      await this.ordersCollection.delete({ structure_id: structureId, order_id: { $nin: newestOrderIds  } });
    }
  }

  async updateStructures(authorization: string) {
    let structureIdsHaveChanged = false;
    let newestStructureIds: number[] = [];
    await this.esiService.update<number[]>({
      method: 'get',
      url: '/universe/structures'
    }).subscribe({
      next: async (structureIds) => {
        structureIdsHaveChanged = true;
        newestStructureIds = newestStructureIds.concat(structureIds);
        return this.structuresCollection.putMany(structureIds.map((structureId) => ({ structure_id: structureId })));
      }
    });
    if (structureIdsHaveChanged) {
      await this.structuresCollection.delete({ structure_id: { $nin: newestStructureIds  } });
    }

    const structures = await this.structuresCollection.find({}, { projection: { structure_id: 1 } });
    return Promise.all(structures.map((structure) => {
      return this.esiService.update<Structure>({
        method: 'get',
        url: `/universe/structures/${structure.structure_id}`,
        headers: { authorization }
      }).subscribe({
        next: (s) => {
          return this.structuresCollection.updateOne({ structure_id: structure.structure_id }, s);
        },
        error: async (err) => {
          if (err instanceof AxiosError) {
            if (err.response?.status === 403) {
              log.warn(`Deleting structure with ID ${structure.structure_id} due to 403 Forbidden response...`);
              return this.structuresCollection.deleteOne({ structure_id: structure.structure_id });
            }
          }
          throw err;
        }
      });
    }));
  }

  async updateSystems() {
    let systemIdsHaveChanged = false;
    let newestSystemIds: number[] = [];
    await this.esiService.update<number[]>({
      method: 'get',
      url: '/universe/systems'
    }).subscribe({
      next: async (systemIds) => {
        systemIdsHaveChanged = true;
        newestSystemIds = newestSystemIds.concat(systemIds);
        return this.systemsCollection.putMany(systemIds.map((systemId) => ({ system_id: systemId })));
      }
    });
    if (systemIdsHaveChanged) {
      await this.systemsCollection.delete({ system_id: { $nin: newestSystemIds  } });
    }

    const systems = await this.systemsCollection.find({}, { projection: { system_id: 1 } });
    return Promise.all(systems.map((system) => {
      return this.esiService.update<System>({
        method: 'get',
        url: `/universe/systems/${system.system_id}`
      }).subscribe({
        next: (s) => {
          return this.systemsCollection.updateOne({ system_id: system.system_id }, s);
        }
      })
    }));
  }

  async updateTypes() {
    let typeIdsHaveChanged = false;
    let newestTypeIds: number[] = [];
    await this.esiService.update<number[]>({
      method: 'get',
      url: '/universe/types'
    }).subscribe({
      next: async (typeIds) => {
        typeIdsHaveChanged = true;
        newestTypeIds = newestTypeIds.concat(typeIds);
        await this.typesCollection.putMany(typeIds.map((typeId) => ({ type_id: typeId })));
      }
    });
    if (typeIdsHaveChanged) {
      await this.typesCollection.delete({ type_id: { $nin: newestTypeIds  } });
    }

    const types = await this.typesCollection.find({}, { projection: { type_id: 1 } });
    return Promise.all(types.map((type) => {
      return this.esiService.update<System>({
        method: 'get',
        url: `/universe/types/${type.type_id}`
      }).subscribe({
        next: (t) => {
          return this.typesCollection.updateOne({ type_id: type.type_id }, t);
        }
      })
    }));
  }
}
