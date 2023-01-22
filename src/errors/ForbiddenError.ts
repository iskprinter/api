import HttpError from './HttpError'

export default class ForbiddenError extends HttpError {
  static readonly STATUS_CODE = 403;

  constructor (message?: string) {
    super(ForbiddenError.STATUS_CODE, message || 'Forbidden')
  }
}
