import { HttpError } from 'src/errors/HttpError'

export class BadRequestError extends HttpError {
  static readonly STATUS_CODE = 400;

  constructor (message: string) {
    super(BadRequestError.STATUS_CODE, message || 'Bad request')
  }
}
