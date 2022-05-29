import express, { Request, Response, NextFunction } from 'express'

import stationTradingController from 'src/controllers/StationTradingController'
import Type from 'src/entities/Type'

const router = express.Router()

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  const types: Type[] = await stationTradingController.getAllTypes();
  return res.json(types);
})

export default router
