export default interface EsiRequest {
  requestId: string
  locked: number;
  etag: string;
  expires: number;
  method: string;
  url: string;
  params: object;
}
