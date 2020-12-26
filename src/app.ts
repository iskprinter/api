import express from 'express';
import logger from 'morgan';

import indexRoutes from 'src/routes/index';

let app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  next();
});

app.use('/', indexRoutes);

export default app;
