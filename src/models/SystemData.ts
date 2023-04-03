export default interface SystemData {
  system_id: number;
  constellation_id: number;
  name: string;
  planets: {
    asteroid_belts: number,
    moons: number,
    planet_id: number,
  }[];
  position: {
    x: number,
    y: number,
    z: number,
  };
  security_class: string;
  security_status: number;
  star_id: number;
  stargates: number[];
  stations: number[];
}
