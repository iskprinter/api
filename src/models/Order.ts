import { DataProxy } from "src/services";
import EveModel from "./EveModel";
import OrderData from "./OrderData";

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface Order extends OrderData { }
class Order extends EveModel implements OrderData {
  constructor(dataProxy: DataProxy, orderData: OrderData) {
    super(dataProxy);
    Object.assign(this, orderData);
  }
}
export default Order;
