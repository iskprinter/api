export default interface EsiRequest {
  path: string
  inProgress: boolean;
  etag: string;
  expires: number;
}
