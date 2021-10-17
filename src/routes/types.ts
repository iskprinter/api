import express, { Request, Response, NextFunction } from 'express'

import { Type } from 'src/entities/Type'

const router = express.Router()

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const types: Type[] = await Type.find({})
    return res.json(types)
  } catch (error) {
    console.error(error)
    return res.sendStatus(500)
  }
})

export default router
