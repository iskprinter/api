import HttpError from './HttpError'

export default class TooManyRequestsError extends HttpError {
  static readonly STATUS_CODE = 429;

  constructor (message?: string) {
    super(TooManyRequestsError.STATUS_CODE, message || 'Too many requests')
  }
}
