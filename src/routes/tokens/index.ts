import { Application } from 'express';
import { AuthController } from 'src/controllers';
import v0 from './v0';

export default function (
  app: Application,
  authController: AuthController
) {
  v0(app, authController);
}
