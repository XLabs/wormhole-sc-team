#!/bin/bash

set -meuo pipefail
export DOCKER_BUILDKIT=1

SIGNER_NAME="Guardian"
GUARDIAN_COUNT=19

docker build --tag dkg-signer --file ./signer.Dockerfile --progress=plain .

for ((i = 0; i < GUARDIAN_COUNT; i++))
do
  docker run --rm --name "${SIGNER_NAME}$i" --network=dkg-test \
    --mount "type=bind,src=./out/$i/keys,dst=/keys" \
    dkg-signer &
done

wait
