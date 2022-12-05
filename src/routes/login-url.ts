import express, { Router } from 'express'
import AuthenticationController from 'src/controllers/AuthenticationController';
import { Database } from 'src/databases/Database';

export default function loginRoutes(database: Database): Router {

  const router = express.Router()
  const authenticationController = new AuthenticationController(database);

  router.get('/', authenticationController.getLoginUrl());

  return router;

}
