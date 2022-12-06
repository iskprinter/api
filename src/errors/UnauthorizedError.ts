import HttpError from './HttpError'

export default class UnauthorizedError extends HttpError {
  static readonly STATUS_CODE = 401;

  constructor (message?: string) {
    super(UnauthorizedError.STATUS_CODE, message || 'Unauthorized')
  }
}
