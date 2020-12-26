// #!/usr/bin/env node

/**
 * Module dependencies.
 */

import app from 'src/app';
import http from 'http';
import { AddressInfo } from 'net';

/**
 * Get port from environment and store in Express.
 */

let port = normalizePort(process.env.PORT || '3000');
app.set('port', port);

/**
 * Create HTTP server.
 */

let server = http.createServer(app);

/**
 * Listen on provided port, on all network interfaces.
 */

server.listen(port);
server.on('error', onError);
server.on('listening', onListening);

/**
 * Normalize a port into a number, string, or false.
 */

function normalizePort(val: string) {
  let port = parseInt(val, 10);

  if (isNaN(port)) {
    // named pipe
    return val;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return false;
}

/**
 * Event listener for HTTP server "error" event.
 */

function onError(error: { syscall: string; code: any; }) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  let bind = typeof port === 'string'
    ? 'Pipe ' + port
    : 'Port ' + port;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      console.error(bind + ' requires elevated privileges');
      process.exit(1);
    case 'EADDRINUSE':
      console.error(bind + ' is already in use');
      process.exit(1);
    default:
      throw error;
  }
}

/**
 * Exit the process if CTRL+C is pressed.
 */
process.on('SIGINT', function() {
  console.log( "\nGracefully shutting down from SIGINT (Ctrl+C)" );
  // some other closing procedures go here
  process.exit(1);
});

/**
 * Event listener for HTTP server "listening" event.
 */

function onListening() {
  let addr: string | AddressInfo | null = server.address();
  if (addr === null) {
    throw new Error("Server address is null.");
  }
  let bind = typeof addr === 'string'
    ? 'pipe ' + addr
    : 'port ' + addr.port;
  console.log(`Listening on ${bind}...`);
}
