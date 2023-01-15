import { AxiosError } from "axios";
import { Collection } from "src/databases";
import { Constellation, Deal, Group, Order, Region, Station, Structure, System, Type } from "src/models";
import { DealFinder, InventoryTimesMarginStrategy } from "./DealFinder";
import EsiService from "./EsiService";
import log from 'src/tools/Logger';

export default class DataProxy {
  constructor(
    public esiService: EsiService,
    public constellationsCollection: Collection<Constellation>,
    public groupsCollection: Collection<Group>,
    public ordersCollection: Collection<Order>,
    public regionsCollection: Collection<Region>,
    public stationsCollection: Collection<Station>,
    public structuresCollection: Collection<Structure>,
    public systemsCollection: Collection<System>,
    public typesCollection: Collection<Type>,
  ) { }

  async getConstellations(query: object = {}): Promise<Constellation[]> {
    const constellations = await this.constellationsCollection.find(query);
    return constellations;
  }

  async getDeals(regionId: number): Promise<Deal[]> {

    // Get the character's open market orders
    // this.ordersCollection.find({ characterId });

    // Get the set of marketable types
    const typeIds = (await this.groupsCollection.find({}))
      .filter((group) => group.market_group_id !== 2 && group.parent_group_id !== 2) // Blueprints and reactions
      .filter((group) => group.market_group_id !== 150 && group.parent_group_id !== 150) // Skill books
      .reduce((typeIds: number[], group) => [...typeIds, ...(group.types || [])], []);

    const orders: Order[] = await this.ordersCollection.find({ region_id: regionId });

    const types: Type[] = await this.typesCollection.find({ type_id: { $in: typeIds } });

    // Compute deals
    const strategy = new InventoryTimesMarginStrategy(types, orders);
    const dealFinder = new DealFinder(strategy);
    const deals: Deal[] = dealFinder.getDeals();
    return deals;
  }

  async getGroups(): Promise<Group[]> {
    const groups = await this.groupsCollection.find({});
    return groups;
  }

  async getOrders(): Promise<Order[]> {
    const orders = await this.ordersCollection.find({});
    return orders;
  }

  async getRegions(): Promise<Region[]> {
    const regions = await this.regionsCollection.find({});
    return regions;
  }

  async getStations({ regionId, constellationId, systemId, stationId }: { regionId?: number, constellationId?: number, systemId?: number, stationId?: number }): Promise<Station[]> {
    if (stationId) {
      const stations = await this.stationsCollection.find({ station_id: stationId });
      return stations;
    }
    if (systemId) {
      const stations = await this.stationsCollection.find({ system_id: systemId });
      return stations;
    }
    if (constellationId) {
      const constellations = await this.constellationsCollection.find({ constellation_id: constellationId });
      const systemIds = constellations.reduce((systemIds: number[], constellation) => [...systemIds, ...(constellation.systems || [])], []);
      const stations = await this.stationsCollection.find({ system_id: { $in: systemIds } });
      return stations;
    }
    if (regionId) {
      const constellations = await this.constellationsCollection.find({ region_id: regionId });
      const systemIds = constellations.reduce((systemIds: number[], constellation) => [...systemIds, ...(constellation.systems || [])], []);
      const stations = await this.stationsCollection.find({ system_id: { $in: systemIds } });
      return stations;
    }
    const stations = await this.stationsCollection.find({});
    return stations;
  }

  async getStructures({ regionId, constellationId, systemId, structureId }: { regionId?: number, constellationId?: number, systemId?: number, structureId?: number }) {
    if (structureId) {
      const structures = await this.structuresCollection.find({ structure_id: structureId });
      return structures;
    }
    if (systemId) {
      const structures = await this.structuresCollection.find({ solar_system_id: systemId });
      return structures;
    }
    if (constellationId) {
      const constellations = await this.constellationsCollection.find({ constellation_id: constellationId });
      const systemIds = constellations.reduce((systemIds: number[], constellation) => [...systemIds, ...(constellation.systems || [])], []);
      const structures = await this.structuresCollection.find({ solar_system_id: { $in: systemIds } });
      return structures;
    }
    if (regionId) {
      const constellations = await this.constellationsCollection.find({ region_id: regionId });
      const systemIds = constellations.reduce((systemIds: number[], constellation) => [...systemIds, ...(constellation.systems || [])], []);
      const structures = await this.structuresCollection.find({ solar_system_id: { $in: systemIds } });
      return structures;
    }
    const structures = await this.structuresCollection.find({});
    return structures;
  }

  async getSystems({ regionId, constellationId }: { regionId?: number, constellationId?: number }): Promise<System[]> {
    if (constellationId) {
      const constellations = await this.constellationsCollection.find({ constelation_id: constellationId });
      const systemIds = constellations.reduce((systemIds: number[], constellation) => [...systemIds, ...(constellation.systems || [])], []);
      const systems = await this.systemsCollection.find({ system_id: { $in: systemIds } });
      return systems;
    }
    if (regionId) {
      const constellations = await this.constellationsCollection.find({ region_id: regionId });
      const systemIds = constellations.reduce((systemIds: number[], constellation) => [...systemIds, ...(constellation.systems || [])], []);
      const systems = await this.systemsCollection.find({ system_id: { $in: systemIds } });
      return systems;
    }
    const systems = await this.systemsCollection.find({});
    return systems;
  }

  async updateConstellations() {
    return this.esiService.update<number[]>({
      method: 'get',
      url: '/universe/constellations'
    }).subscribe({
      next: (constellationIds) => {
        return Promise.all(constellationIds.map((constellationId) => {
          return this.esiService.update<Constellation>({
            method: 'get',
            url: `/universe/constellations/${constellationId}`
          }).subscribe({
            next: (constellation) => {
              return this.constellationsCollection.updateOne({ constellation_id: constellationId }, constellation);
            }
          });
        }));
      }
    });
  }

  async updateMarketGroups() {
    return this.esiService.update<number[]>({
      method: 'get',
      url: '/market/groups'
    }).subscribe({
      next: (groupIds) => {
        return Promise.all(groupIds.map((groupId) => {
          return this.esiService.update<Group>({
            method: 'get',
            url: `/market/groups/${groupId}`
          }).subscribe({
            next: (group) => {
              return this.groupsCollection.updateOne({ market_group_id: groupId }, group);
            }
          });
        }));
      }
    });
  }

  updateMarketOrders(regionId: number, orderType: string) {
    return this.esiService.update<Order[]>({
      method: 'get',
      url: `/markets/${regionId}/orders`,
      params: { order_type: orderType }
    }).subscribe({
      next: (orders) => {
        return this.ordersCollection.putMany(orders.map((order) => ({ ...order, region_id: regionId })));
      }
    });
  }

  async updateRegions() {
    await this.esiService.update<number[]>({
      method: 'get',
      url: '/universe/regions'
    }).subscribe({
      next: async (regionIds) => {
        await this.regionsCollection.putMany(regionIds.map((regionId) => ({ region_id: regionId })));
        return this.regionsCollection.delete({ region_id: { $nin: regionIds } });
      }
    });

    const regions = await this.regionsCollection.find({}, { projection: { region_id: 1 } });
    return Promise.all(regions.map((region) => {
      return this.esiService.update<Region>({
        method: 'get',
        url: `/universe/regions/${region.region_id}`
      }).subscribe({
        next: (region) => {
          this.regionsCollection.updateOne({ region_id: region.region_id }, region);
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
        next: (station) => {
          return this.stationsCollection.updateOne({ station_id: stationId }, station);
        },
        error: async (err) => {
          if (err instanceof AxiosError) {
            if (err.response?.status === 404) {
              log.warn(`Deleting station with ID ${stationId}...`);
              return this.stationsCollection.deleteOne({ station_id: stationId });
            }
          }
          throw err;
        }
      });
    }));
  }

  async updateStructures(authorization: string) {
    await this.esiService.update<number[]>({
      method: 'get',
      url: '/universe/structures'
    }).subscribe({
      next: async (structureIds) => {
        await this.structuresCollection.putMany(structureIds.map((structureId) => ({ structure_id: structureId })));
        return this.structuresCollection.delete({ structure_id: { $nin: structureIds } });
      }
    });

    const structures = await this.structuresCollection.find({}, { projection: { structure_id: 1 } });
    return Promise.all(structures.map((structure) => {
      return this.esiService.update<Structure>({
        method: 'get',
        url: `/universe/structures/${structure.structure_id}`,
        headers: { authorization }
      }).subscribe({
        next: (structure) => {
          return this.structuresCollection.updateOne({ structure_id: structure.structure_id }, structure);
        },
        error: async (err) => {
          if (err instanceof AxiosError) {
            if ([403, 404].includes(Number(err.response?.status))) {
              log.warn(`Deleting structure with ID ${structure.structure_id}...`);
              return this.stationsCollection.deleteOne({ structure_id: structure.structure_id });
            }
          }
          throw err;
        }
      });
    }));
  }

  async updateSystems() {
    await this.esiService.update<number[]>({
      method: 'get',
      url: '/universe/systems'
    }).subscribe({
      next: async (systemIds) => {
        await this.systemsCollection.putMany(systemIds.map((systemId) => ({ system_id: systemId })));
        return this.regionsCollection.delete({ system_id: { $nin: systemIds } });
      }
    });
    const systems = await this.systemsCollection.find({}, { projection: { system_id: 1 } });
    await Promise.all(systems.map((system) => {
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

  updateTypes() {
    return this.esiService.update<number[]>({
      method: 'get',
      url: '/universe/types'
    }).subscribe({
      next: (typeIds) => {
        return Promise.all(typeIds.map((typeId) => {
          return this.esiService.update<Type>({
            method: 'get',
            url: `/universe/types/${typeId}`
          }).subscribe({
            next: (type) => {
              return this.typesCollection.updateOne({ type_id: typeId }, type)
            }
          });
        }));
      }
    });
  }
}
