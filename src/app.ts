import axios from 'axios';
import cors from 'cors';
import env from 'env-var';
import express, { Request, Response, NextFunction } from 'express';
import expressPinoLogger from 'express-pino-logger';

import indexRoutes from 'src/routes/index';
import { HttpError } from './errors/HttpError';

const app = express()

// Enable CORS
app.use(cors({ origin: env.get('FRONTEND_URLS').required().asString()?.split(",") }))

// Enable pino logging
app.use(expressPinoLogger());

// Enable body parsing
app.use(express.json())
app.use(express.urlencoded({ extended: false }))

// Load the application routes
app.use('/', indexRoutes)

app.use(async (err: any, req: Request, res: Response, next: NextFunction): Promise<void> => {
  console.log(req);

  if (!err) {
    console.log(res);
    return next();
  }

  if (err instanceof HttpError) {
    console.log(`${err.statusCode}: ${err.message}`);
    res.status(err.statusCode).json(err.message);
    console.log(res);
    return;
  }

  console.error('Non-http error received. Returning 500.')
  res.sendStatus(500);
  console.log(res);
  console.error(err);
  return;
});

axios.interceptors.request.use(req => {
  console.log(req);
  return req;
})

axios.interceptors.response.use(res => {
  console.log(res);
  return res;
})

export default app;
