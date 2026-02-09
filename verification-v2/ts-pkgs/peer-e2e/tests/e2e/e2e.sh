#!/bin/bash

set -xmeuo pipefail

rm -rf out/

# These scripts are meant to be run with this directory as the working directory

if [[ -z "${GITHUB_ACTIONS:-}" ]]; then
    ./scripts/clean.sh
fi
./scripts/setup.sh
./scripts/anvil.sh &
./scripts/server.sh &
./scripts/client.sh

# Make sure the peer server and the dkg clients are shut down:

docker stop peer-server

for i in $(seq 0 18)
do
  docker stop "Guardian$i"
done;


./scripts/signer.sh &
./scripts/guardian.sh &
./scripts/publish.sh
./scripts/clean.sh

# Wait for anvil and server subshells to check that their exit codes are zero
wait
