import axios from 'axios';
import cors from 'cors';
import env from 'env-var';
import express, { Application, Request, Response, NextFunction } from 'express';
import expressPinoLogger from 'express-pino-logger';
import { Database } from 'src/databases';

import indexRoutes from 'src/routes/index';
import { HttpError } from 'src/errors';
import log from 'src/tools/Logger';

function createApp(database: Database): Application {

  const app = express()

  // Enable CORS
  app.use(cors({ origin: env.get('FRONTEND_URLS').required().asString()?.split(",") }));

  // Enable pino logging
  app.use(expressPinoLogger());

  // Enable body parsing
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  // Load the application routes
  app.use('/', indexRoutes(database));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  app.use(async (err: any, req: Request, res: Response, next: NextFunction): Promise<void> => {
    log.info(req);

    if (!err) {
      log.info(res);
      return next();
    }

    if (err instanceof HttpError) {
      log.info(`${err.statusCode}: ${err.message}`);
      res.status(err.statusCode).json(err.message);
      log.info(res);
      return;
    }

    log.error('Non-http error received. Returning 500.')
    res.sendStatus(500);
    log.info(res);
    log.error(err);
    return;
  });

  axios.interceptors.request.use(req => {
    log.info(req);
    return req;
  })

  axios.interceptors.response.use(res => {
    log.info(res);
    return res;
  })

  return app;

}

export default createApp;
