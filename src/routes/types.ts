import express, { Request, Response, NextFunction } from 'express'

import { Type } from 'src/entities/Type'

const router = express.Router()

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  const types: Type[] = await Type.find({})
  return res.json(types)
})

export default router
