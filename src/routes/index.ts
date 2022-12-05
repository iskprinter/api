import express, { Request, Response, Router } from 'express';
import { Database } from 'src/databases/Database';

import tokenRoutes from 'src/routes/tokens';
import typeRoutes from 'src/routes/types';

export default function indexRoutes(database: Database): Router {

  const router = express.Router();

  router.use('/tokens', tokenRoutes(database));
  router.use('/types', typeRoutes(database));

  router.get('/', async (req: Request, res: Response) => {
    res.sendStatus(200);
  });

  return router;
}
