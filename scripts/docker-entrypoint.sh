#!/bin/sh
set -e

# Run migrations on container start
if [ -x "$(command -v npx)" ]; then
  echo "Running prisma migrate deploy..."
  npx prisma migrate deploy || true
fi

# Run any init DB script if present
if [ -f ./scripts/init-db.js ]; then
  echo "Running init-db.js"
  node ./scripts/init-db.js || true
fi

echo "Starting server"
exec node server.js
