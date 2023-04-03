import TradeData from './TradeData';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface Trade extends TradeData { }
class Trade implements TradeData {
  constructor(TradeData: TradeData) {
    Object.assign(this, TradeData);
  }
}
export default Trade;
