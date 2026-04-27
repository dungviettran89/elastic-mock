#!/usr/bin/env bash

set -e

# 1. Checkout tests
if [ ! -d "./external-tests" ]; then
  echo "Cloning external tests..."
  git clone --depth 1 --branch 8.19 https://github.com/elastic/elasticsearch-clients-tests.git ./external-tests
else
  echo "External tests already exist, skipping clone."
fi

# 2. Start server
echo "Starting elastic-mock server via PM2..."
npm run service:start

# Function to cleanup server on exit
cleanup() {
  echo "Stopping elastic-mock server..."
  npm run service:stop || true
}
trap cleanup EXIT

# 3. Wait for server to be ready
echo "Waiting for server to be ready..."
MAX_RETRIES=30
COUNT=0
while ! curl -s http://localhost:19200/_cluster/health > /dev/null; do
  sleep 1
  COUNT=$((COUNT + 1))
  if [ $COUNT -ge $MAX_RETRIES ]; then
    echo "Server failed to start in time."
    exit 1
  fi
done
echo "Server is ready."

# 4. Execute test case
echo "Executing external tests..."
npx tsx scripts/external-test-runner.ts ./external-tests/tests

echo "Done."
