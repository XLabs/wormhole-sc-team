#!/bin/bash

set -xeuo pipefail

# Publish VAA
PUBLISH_SIG="publishMessage(uint32, bytes, uint8)"
PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
ETHEREUM_RPC_URL="http://anvil-with-verifier:8545"
WORMHOLE_ADDRESS="0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0"

# Retrieve VAA
GUARDIAN_PORT=8081
GUARDIAN_RPC="127.0.0.1:${GUARDIAN_PORT}"
EMITTER_ADDRESS="000000000000000000000000f39fd6e51aad88f6f4ce6ab8827279cfffb92266"
ETHEREUM_CHAIN_ID=2
SEQUENCE=0
SIGNED_VAA_ENDPOINT="v1/signed_vaa/${ETHEREUM_CHAIN_ID}/${EMITTER_ADDRESS}/${SEQUENCE}"

# Verify VAA
VERIFY_SIG="verify(bytes)"
VERIFIER_ADDRESS=0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9

waitUntilHeartbeat() {
  docker exec --env "GUARDIAN_RPC=${GUARDIAN_RPC}" ${1} bash -c '
    start=$(date +%s)
    deadline=$((start+60))
    until curl --silent --fail "${GUARDIAN_RPC}/v1/heartbeats"; do
      now=$(date +%s)
      if [ "$now" -ge "$deadline" ]; then
        echo "Timed out waiting for heartbeat" >&2
        exit 1
      fi
      sleep 0.5
    done
  '
}

fetchVaa() {
  docker exec --env "SIGNED_VAA_ENDPOINT=${SIGNED_VAA_ENDPOINT}" \
    --env "VAA_VERSION=${1}" \
    --env "GUARDIAN_PORT=${GUARDIAN_PORT}" \
    GuardianNode0 bash -c '
      set -x
      start=$(date +%s)
      deadline=$((start+60))
      i=0
      until vaa=$(curl --silent --fail "http://GuardianNode${i}:${GUARDIAN_PORT}/${SIGNED_VAA_ENDPOINT}?message_id.version=${VAA_VERSION}"); do
        now=$(date +%s)
        i=$(((i+1) % 18))
        if [ "$now" -ge "$deadline" ]; then
          echo "Timed out waiting for VAA" >&2
          exit 1
        fi
        sleep 0.5
      done
      echo "$vaa"
    ' | jq --raw-output --exit-status ".vaaBytes"
}

toCleanHex() {
  echo "${1}" | base64 --decode | od -An -vtx1 | tr --delete ' \n'
}

for i in $(seq 0 18)
do
  until [ "$(docker inspect --format '{{.State.Running}}' "GuardianNode$i" 2>/dev/null)" = "true" ]; do
    sleep 0.5
  done
done;

for i in $(seq 0 18)
do
  waitUntilHeartbeat "GuardianNode$i"
done;

docker exec anvil-with-verifier cast send --private-key="${PRIVATE_KEY}" "${WORMHOLE_ADDRESS}" "${PUBLISH_SIG}" 0 "0x5ABAD00B" 200

vaas=(
  "$(fetchVaa 1)"
  "$(fetchVaa 2)"
)

for vaa in "${vaas[@]}"
do
  docker exec anvil-with-verifier \
    cast call "${VERIFIER_ADDRESS}" "${VERIFY_SIG}" "$(toCleanHex ${vaa})"
done
