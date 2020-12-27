import express, { Request, Response, NextFunction } from 'express';

import loginUrlRoutes from 'src/routes/api/login-url';
import tokenRoutes from 'src/routes/api/tokens';
import typeRoutes from 'src/routes/api/types';

const router = express.Router();

router.use('/login-url', loginUrlRoutes);
router.use('/tokens', tokenRoutes);
router.use('/types', typeRoutes);

router.get('/', (req: Request, res: Response, next: NextFunction) => {
  res.sendStatus(200);
});

export default router;
