import express, { Request, Response, NextFunction } from 'express';

import { RequiredParams, RequestValidator } from 'src/tools/RequestValidator';
import { HttpError } from 'src/errors/HttpError';
import { AuthenticationController } from 'src/controllers/Authentication';
import { BadRequestError } from 'src/errors/BadRequestError';

const router = express.Router();

router.post('/', async (req: Request, res: Response, next: NextFunction) => {

  try {

    let accessToken;
    if (req.body.code) {

      const requiredParams: RequiredParams = {
        body: [ 'code' ],
        query: [],
      };
      (new RequestValidator(requiredParams)).validate(req);
      accessToken = await (new AuthenticationController).getTokenFromCode(req.body.code);

    } else if (req.body.accessToken) {

      const requiredParams: RequiredParams = {
        body: [ 'accessToken' ],
        query: [],
      };
      (new RequestValidator(requiredParams)).validate(req);
      accessToken = await (new AuthenticationController).getTokenFromRefresh(req.body.accessToken);

    } else {
      throw new BadRequestError("Expected the request body to contain 'code' or 'accessToken'.");
    }

    return res.json(accessToken);

  } catch (error) {

    if (error instanceof HttpError) {
      return res.status(error.statusCode).send(error.message);
    }
    console.error(error);
    return res.sendStatus(500);

  }

});

export default router;
