import { AxiosRequestConfig } from "axios";

export default interface EsiRequestConfig<T> {
  query: () => Promise<T>,
  path: string,
  requestConfig?: AxiosRequestConfig,
  update: (data: T) => Promise<T>,
}
