#!/usr/bin/env bash

set -e

# 1. Checkout tests
if [ ! -d "./external-tests" ]; then
  echo "Cloning external tests..."
  git clone --depth 1 https://github.com/elastic/elasticsearch-clients-tests.git ./external-tests
else
  echo "External tests already exist, skipping clone."
fi

# 2. Start server in background
echo "Starting elastic-mock server..."
npm run dev -- serve --port 19200 > server.log 2>&1 &
SERVER_PID=$!

# Function to cleanup server on exit
cleanup() {
  echo "Stopping server (PID: $SERVER_PID)..."
  kill $SERVER_PID || true
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
