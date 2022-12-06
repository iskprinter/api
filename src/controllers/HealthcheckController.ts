import { Request, RequestHandler, Response } from "express";

export default class HealthcheckController {

  announceHealth(): RequestHandler {
    return async (req: Request, res: Response) => {
      res.sendStatus(200);
    }
  }
}
