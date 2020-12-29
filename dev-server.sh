#!/bin/bash

set -euo pipefail

stop_children() {
    echo 'Terminating children...'
    kill -TERM -$$ &>/dev/null || exit 0
}
trap stop_children EXIT

kubectl --context docker-desktop -n iskprinter port-forward svc/database 27017:27017 &
node_modules/.bin/webpack --mode development --watch &
node_modules/.bin/nodemon dist/app.js &
wait
