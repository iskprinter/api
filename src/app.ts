import express from 'express'
import logger from 'morgan'

import indexRoutes from 'src/routes/index'

const app = express()

app.use(logger('dev'))
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use('/', indexRoutes)

export default app
