import express, { Request, Response, NextFunction } from 'express';

import apiRoutes from 'src/routes/api';

const router = express.Router();

router.use('/api', apiRoutes);

router.get('/', (req: Request, res: Response, next: NextFunction) => {
  res.sendStatus(200);
});

export default router;
