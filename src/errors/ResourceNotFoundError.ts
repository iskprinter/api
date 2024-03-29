import HttpError from './HttpError'

export default class ResourceNotFoundError extends HttpError {
  static readonly STATUS_CODE = 404;

  constructor (message?: string) {
    super(ResourceNotFoundError.STATUS_CODE, message || 'Resource not found')
  }
}
