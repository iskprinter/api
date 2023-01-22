export default class Structure {
  structure_id!: number;
  name?: string;
  owner_id?: number;
  position?: {
    x: number,
    y: number,
    z: number,
  };
  solar_system_id?: number;
  type_id?: number;
}
