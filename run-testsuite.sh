#!/usr/bin/env bash

# Stop if any errors found
set -e

node --trace-deprecation node_modules/jasmine-node/lib/jasmine-node/cli.js spec/infinispan_auth_spec.js --captureExceptions
#node --trace-deprecation node_modules/jasmine-node/lib/jasmine-node/cli.js spec/* --captureExceptions
