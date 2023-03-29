// import { Application } from 'express'
// import Joi from 'joi';

// import { AuthController, StationTradingController, ValidationController } from 'src/controllers'

// export default function (
//   app: Application,
//   authController: AuthController,
//   stationTradingController: StationTradingController,
//   validationController: ValidationController,
// ) {
//   app.get(
//     '/v0/orders',
//     authController.validateAuth(),
//     validationController.validate({
//       query: Joi.object({
//         'order-type': Joi.allow('all', 'buy', 'sell').required(),
//         'region-id': Joi.number().required(),
//         'structure-id': Joi.number(),
//       })
//     }),
//     stationTradingController.getOrders(),
//     stationTradingController.updateOrders(),
//   );
// }
