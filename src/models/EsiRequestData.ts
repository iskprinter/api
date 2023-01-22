export default interface EsiRequestData {
  requestId: string
  locked: number;
  etag: string;
  expires: number;
  method: string;
  url: string;
  params: object;
}
