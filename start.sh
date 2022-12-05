#!/usr/bin/env bash

set -euo pipefail

node_modules/.bin/webpack --watch &
NODE_OPTIONS=--enable-source-maps node_modules/.bin/nodemon dist/app.js &
wait
