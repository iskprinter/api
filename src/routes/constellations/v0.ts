import { Application } from 'express'

import { StationTradingController } from 'src/controllers'

export default function (
  app: Application,
  stationTradingController: StationTradingController
) {
  app.get(
    '/v0/constellations',
    stationTradingController.getConstellations(),
    stationTradingController.updateConstellations(),
  );
}
