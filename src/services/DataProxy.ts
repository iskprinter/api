import { Subscription } from "rxjs";
import { Collection } from "src/databases";
import { Constellation, Deal, Group, Order, Region, Station, Structure, System, Type } from "src/models";
import { DealFinder, InventoryTimesMarginStrategy } from "./DealFinder";
import EsiService from "./EsiService";

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

  updateConstellations(): Subscription {
    return this.esiService.update<number[]>({
      method: 'get',
      url: '/universe/constellations'
    }).subscribe((constellationIds) => {
      return Promise.all(constellationIds.map((constellationId) => {
        return this.esiService.update<Constellation>({
          method: 'get',
          url: `/universe/constellations/${constellationId}`
        }).subscribe((constellation) => {
          this.constellationsCollection.updateOne({ constellation_id: constellationId }, constellation);
        });
      }));
    });
  }

  updateMarketGroups(): Subscription {
    return this.esiService.update<number[]>({
      method: 'get',
      url: '/market/groups'
    }).subscribe((groupIds) => {
      return Promise.all(groupIds.map((groupId) => {
        return this.esiService.update<Group>({
          method: 'get',
          url: `/market/groups/${groupId}`
        }).subscribe((group) => {
          return this.groupsCollection.updateOne({ market_group_id: groupId }, group);
        });
      }));
    });
  }

  updateMarketOrders(regionId: number, orderType: string): Subscription {
    return this.esiService.update<Order[]>({
      method: 'get',
      url: `/markets/${regionId}/orders`,
      params: { order_type: orderType }
    }).subscribe((orders) => {
      return this.ordersCollection.putMany(orders.map((order) => ({ ...order, region_id: regionId })));
    });
  }

  updateRegions(): Subscription {
    return this.esiService.update<number[]>({
      method: 'get',
      url: '/universe/regions'
    }).subscribe((regionIds) => {
      return Promise.all(regionIds.map((regionId) => {
        return this.esiService.update<Region>({
          method: 'get',
          url: `/universe/regions/${regionId}`
        }).subscribe((region) => {
          return this.regionsCollection.updateOne({ region_id: regionId }, region);
        });
      }));
    });
  }

  updateStations(): Subscription {
    return this.esiService.update<number[]>({
      method: 'get',
      url: '/universe/systems'
    }).subscribe((systemIds) => {
      return Promise.all(systemIds.map((systemId) => {
        return this.esiService.update<System>({
          method: 'get',
          url: `/universe/systems/${systemId}`
        }).subscribe((system) => {
          this.systemsCollection.updateOne({ system_id: systemId }, system);
          return Promise.all((system.stations || []).map((stationId) => {
            return this.esiService.update<Station>({
              method: 'get',
              url: `/universe/station/${stationId}`
            }).subscribe((station) => {
              return this.stationsCollection.updateOne({ station_id: stationId }, station);
            });
          }));
        });
      }));
    });
  }

  updateStructures(authorization: string): Subscription {
    return this.esiService.update<number[]>({
      method: 'get',
      url: '/universe/structures'
    }).subscribe((structureIds) => {
      return Promise.all(structureIds.map((structureId) => {
        return this.esiService.update<Structure>({
          method: 'get',
          url: `/universe/structures/${structureId}`,
          headers: { authorization }
        }).subscribe((structure) => {
          return this.structuresCollection.updateOne({ structure_id: structureId }, structure);
        });
      }));
    });
  }

  updateSystems(): Subscription {
    return this.esiService.update<number[]>({
      method: 'get',
      url: '/universe/systems'
    }).subscribe((systemIds) => {
      return Promise.all(systemIds.map((systemId) => {
        return this.esiService.update<System>({
          method: 'get',
          url: `/universe/regions/${systemId}`
        }).subscribe((system) => {
          return this.systemsCollection.updateOne({ system_id: systemId }, system)
        });
      }));
    });
  }

  updateTypes(): Subscription {
    return this.esiService.update<number[]>({
      method: 'get',
      url: '/universe/types'
    }).subscribe((typeIds) => {
      return Promise.all(typeIds.map((typeId) => {
        return this.esiService.update<Type>({
          method: 'get',
          url: `/universe/types/${typeId}`
        }).subscribe((type) => {
          return this.typesCollection.updateOne({ type_id: typeId }, type)
        });
      }));
    });
  }
}
