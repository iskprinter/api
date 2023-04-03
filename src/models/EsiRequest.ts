import EsiRequestData from "./EsiRequestData";

// eslint-disable-next-line @typescript-eslint/no-empty-interface, @typescript-eslint/no-empty-interface
interface EsiRequest extends EsiRequestData { }
class EsiRequest implements EsiRequestData {
  constructor(esiRequestData: EsiRequestData) {
    Object.assign(this, esiRequestData);
  }
}

export default EsiRequest;
