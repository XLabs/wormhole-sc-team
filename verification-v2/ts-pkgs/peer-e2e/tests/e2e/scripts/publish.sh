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
NONCE=0
SIGNED_VAA_ENDPOINT="${GUARDIAN_RPC}/v1/signed_vaa/${ETHEREUM_CHAIN_ID}/${EMITTER_ADDRESS}/${NONCE}"

# Verify VAA
VERIFY_SIG="verify(bytes)"
VERIFIER_ADDRESS=0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9

# TODO: Wait for the guardian to sign the VAA
fetchVaa() {
  docker exec GuardianNode0 curl "${SIGNED_VAA_ENDPOINT}?message_id.version=$1" 2>/dev/null | jq -r ".vaaBytes" | base64 --decode | od -An -vtx1 | tr -d ' \n'
}

docker exec anvil-with-verifier cast send --private-key="${PRIVATE_KEY}" "${WORMHOLE_ADDRESS}" "${PUBLISH_SIG}" 0 "0x5ABAD00B" 200
docker exec anvil-with-verifier cast call "${VERIFIER_ADDRESS}" "${VERIFY_SIG}" "$(fetchVaa 1)"
docker exec anvil-with-verifier cast call "${VERIFIER_ADDRESS}" "${VERIFY_SIG}" "$(fetchVaa 2)"
