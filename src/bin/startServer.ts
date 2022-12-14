#!/usr/bin/env ts-node

/**
 * Module dependencies.
 */

import { AddressInfo } from 'net'
import env from 'env-var';
import http from 'http'

import log from 'src/tools/Logger';
import { Application } from 'express';

export default function startServer(app: Application): void {

  /**
   * Normalize a port into a number, string, or false.
   */

  const normalizePort = (val: string) => {
    const port = parseInt(val, 10)

    if (isNaN(port)) {
      // named pipe
      return val
    }

    if (port >= 0) {
      // port number
      return port
    }

    return false
  }

  /**
   * Event listener for HTTP server "error" event.
   */

  function onError(error: { syscall: string; code: string; }) {
    if (error.syscall !== 'listen') {
      throw error
    }

    const bind = typeof port === 'string'
      ? `Pipe ${port}`
      : `Port ${port}`

    // handle specific listen errors with friendly messages
    switch (error.code) {
      case 'EACCES':
        log.error(`${bind} requires elevated privileges`)
        process.exit(1)
        break;
      case 'EADDRINUSE':
        log.error(`${bind} is already in use`)
        process.exit(1)
        break;
      default:
        throw error
    }
  }

  /**
   * Get port from environment and store in Express.
   */

  const port = normalizePort(String(env.get('PORT').asPortNumber() || 3000));
  app.set('port', port)

  /**
   * Create HTTP server.
   */

  const server = http.createServer(app)


  /**
   * Listen on provided port, on all network interfaces.
   */

  server.listen(port)
  server.on('error', onError)
  server.on('listening', onListening)

  /**
   * Exit the process if CTRL+C is pressed.
   */
  process.on('SIGINT', function () {
    log.info('Gracefully shutting down from SIGINT (Ctrl+C)')
    server.close(() => process.exit(0))
  })

  /**
   * Event listener for HTTP server "listening" event.
   */

  function onListening() {
    const addr: string | AddressInfo | null = server.address()
    if (addr === null) {
      throw new Error('Server address is null.')
    }
    const bind = typeof addr === 'string'
      ? `pipe ${addr}`
      : `port ${addr.port}`
    log.info(`Listening on ${bind}...`)
  }

}
