#!/bin/bash

set -euo pipefail

stop_children() {
    echo 'Terminating children...'
    kill -TERM -$$ &>/dev/null || exit 0
}

trap stop_children EXIT

node_modules/.bin/webpack --mode development --watch &
webpack_pid=$!
node_modules/.bin/nodemon dist/app.js &
nodemon_pid=$!

wait $nodemon_pid
wait $webpack_pid
