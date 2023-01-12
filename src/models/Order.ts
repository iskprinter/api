export default interface Order {
  duration: number;
  is_buy_order?: boolean;
  escrow?: number;
  issued: string;
  is_corporation?: boolean;
  location_id: number;
  min_volume?: number;
  order_id: number;
  price: number;
  range: string;
  state?: string;
  region_id?: number;
  system_id: number;
  type_id: number;
  volume_remain: number;
  volume_total: number;
}
