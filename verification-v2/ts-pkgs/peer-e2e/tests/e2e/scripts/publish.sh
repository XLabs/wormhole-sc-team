#!/bin/bash

set -euo pipefail

# Publish VAA
PUBLISH_SIG="publishMessage(uint32, bytes, uint8)"
PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
ETHEREUM_RPC_URL="http://anvil-with-verifier:8545"
WORMHOLE_ADDRESS="0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0"

# Retrieve VAA
GUARDIAN_RPC="127.0.0.1:8081"
EMITTER_ADDRESS="000000000000000000000000f39fd6e51aad88f6f4ce6ab8827279cfffb92266"
ETHEREUM_CHAIN_ID=2
SEQUENCE=0
SIGNED_VAA_ENDPOINT="${GUARDIAN_RPC}/v1/signed_vaa/${ETHEREUM_CHAIN_ID}/${EMITTER_ADDRESS}/${SEQUENCE}"

# Verify VAA
VERIFY_SIG="verify(bytes)"
VERIFIER_ADDRESS=0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9

fetchVaaV1() {
  docker exec --env "SIGNED_VAA_ENDPOINT=${SIGNED_VAA_ENDPOINT}" GuardianNode0 bash -c '
    start=$(date +%s)
    deadline=$((start+60))
    until vaa=$(curl --silent --fail "${SIGNED_VAA_ENDPOINT}" | jq --raw-output --exit-status ".vaaBytes"); do
      now=$(date +%s)
      if [ "$now" -ge "$deadline" ]; then
        echo "Timed out waiting for VAA" >&2
        exit 1
      fi
      sleep 0.5
    done
    echo "$vaa"
  '
}

docker exec anvil-with-verifier cast send --private-key="${PRIVATE_KEY}" "${WORMHOLE_ADDRESS}" "${PUBLISH_SIG}" 0 "0x5ABAD00B" 200

vaa_v1="$(fetchVaaV1)"
docker exec anvil-with-verifier cast call "${VERIFIER_ADDRESS}" "${VERIFY_SIG}" "$(echo ${vaa_v1} | base64 --decode | od -An -vtx1 | tr --delete ' \n')"
# Query for VAA v2
#vaa_v2="TODO"
#docker exec anvil-with-verifier cast call "${VERIFIER_ADDRESS}" "${VERIFY_SIG}" "$(vaa_v2)"
