export default interface ConstellationData {
  constellation_id: number;
  name: string;
  position: {
    x: number
    y: number,
    z: number,
  };
  region_id: number;
  systems: number[];
}
