import { Request } from 'express'

import { BadRequestError } from 'src/errors/BadRequestError'

export interface RequiredParams {
  body?: string[];
  headers?: string[];
  query?: string[];
}

export class RequestValidator {
  requiredParams: RequiredParams;

  constructor (requiredParams: RequiredParams) {
    this.requiredParams = requiredParams
  }

  public validate (request: Request): boolean {
    if (request === null) {
      throw new Error('Request cannot be null.')
    }
    if (this.requiredParams.headers) {
      for (const param of this.requiredParams.headers) {
        if (!(param in request.headers)) {
          throw new BadRequestError(`Header parameter '${param}' is required.`)
        }
      }
    }
    if (this.requiredParams.body) {
      for (const param of this.requiredParams.body) {
        if (!(param in request.body)) {
          throw new BadRequestError(`Body parameter '${param}' is required.`)
        }
      }
    }
    if (this.requiredParams.query) {
      for (const param of this.requiredParams.query) {
        if (!(param in request.query)) {
          throw new BadRequestError(`Query parameter '${param}' is required.`)
        }
      }
    }
    return true
  };
}
