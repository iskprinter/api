import express, { Request, Response, NextFunction } from 'express'

import loginUrlRoutes from 'src/routes/login-url'
import tokenRoutes from 'src/routes/tokens'
import typeRoutes from 'src/routes/types'

const router = express.Router()

router.use('/login-url', loginUrlRoutes)
router.use('/tokens', tokenRoutes)
router.use('/types', typeRoutes)

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  res.sendStatus(200)
})

export default router
