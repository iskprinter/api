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
        url: req.url,
        headers: req.headers,
        data: req.data,
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
