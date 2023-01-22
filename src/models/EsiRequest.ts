import EsiRequestData from "./EsiRequestData";

export default class EsiRequest implements EsiRequestData {
  requestId: string
  locked: number;
  etag: string;
  expires: number;
  method: string;
  url: string;
  params: object;
  constructor(esiRequestData: EsiRequestData) {
    this.requestId = esiRequestData.requestId;
    this.locked = esiRequestData.locked;
    this.etag = esiRequestData.etag;
    this.expires = esiRequestData.expires;
    this.method = esiRequestData.method;
    this.url = esiRequestData.url;
    this.params = esiRequestData.params;
  }

}
