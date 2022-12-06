import HttpError from './HttpError'

export default class InternalServerError extends HttpError {
  static readonly STATUS_CODE = 500;

  constructor (message: string) {
    super(InternalServerError.STATUS_CODE, message || 'Internal Server Error')
  }
}
