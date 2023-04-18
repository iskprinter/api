import axios, { AxiosError } from 'axios';
import { Agent } from 'https'
import log from 'src/tools/log';

const axiosAgent = axios.create({
  httpsAgent: new Agent({
    keepAlive: true,
    maxSockets: 64, // Same as the maxRequestCount in src/services/EsiService
  }),
});

axiosAgent.interceptors.request.use((req) => {
  log.info({
    baseURL: req.baseURL,
    data: req.data,
    headers: req.headers,
    params: req.params,
    url: req.url,
  });
  return req;
})

axiosAgent.interceptors.response.use((res) => {
  log.info({
    baseURL: res.config.baseURL,
    data: res.data,
    headers: res.headers,
    status: res.status,
    statusText: res.statusText,
    url: res.config.url,
  });
  return res;
}, (err) => {
  if (err instanceof AxiosError) {
    log.warn({
      baseURL: err.response?.config.baseURL,
      data: err.response?.data,
      headers: err.response?.headers,
      status: err.response?.status,
      statusText: err.response?.statusText,
      url: err.response?.config.url,
    });
  } else {
    log.warn(err);
  }
  throw err;
})
export default axiosAgent;
