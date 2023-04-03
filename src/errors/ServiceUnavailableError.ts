import HttpError from './HttpError'

export default class ServiceUnavailableError extends HttpError {
  static readonly STATUS_CODE = 503;

  constructor (message: string) {
    super(ServiceUnavailableError.STATUS_CODE, message || 'Service Unavailable')
  }
}
