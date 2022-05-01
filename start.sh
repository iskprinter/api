#!/usr/bin/env bash

set -euo pipefail

stop_children() {
    echo 'Terminating children...'
    docker stop "$mongo_container_id"
    docker rm "$mongo_container_id"
    kill -TERM -$$ &>/dev/null || exit 0
}
trap stop_children EXIT

mongo_container_id="$(docker run -d -p 27017:27017 mongo:latest)"
node_modules/.bin/webpack --mode development --watch &
node_modules/.bin/nodemon dist/app.js &
wait
