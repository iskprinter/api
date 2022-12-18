import { AxiosRequestConfig } from "axios";

export default interface EsiRequestConfig<T, R> {
  query: () => Promise<R>,
  path: string,
  requestConfig?: AxiosRequestConfig,
  update: (data: T) => Promise<R>,
}
