import { HttpError } from 'src/errors/HttpError'

export class UnauthorizedError extends HttpError {
  static readonly STATUS_CODE = 401;

  constructor (message?: string) {
    super(UnauthorizedError.STATUS_CODE, message || 'Unauthorized')
  }
}
