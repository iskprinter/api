import axios from 'axios';
import { Agent } from 'https'
import log from 'src/tools/Logger';

const axiosAgent = axios.create({
  httpsAgent: new Agent({
    keepAlive: true,
    maxSockets: 8,
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
    status: res.status,
    statusText: res.statusText,
    headers: res.headers,
    data: res.data,
  });
  return res;
})
export default axiosAgent;
