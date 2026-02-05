#!/bin/bash

# Useful to debug issues with the e2e test.
set -meuo pipefail
export DOCKER_BUILDKIT=1

TLS_HOSTNAME="Guardian0"
TLS_PUBLIC_IP="127.0.0.1"
TLS_PORT="3001"
PEER_SERVER_URL="http://peer-server:3000"
ETHEREUM_RPC_URL="http://anvil-with-verifier:8545"
WORMHOLE_ADDRESS="0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0"
GUARDIAN_PRIVATE_KEY="c67c82a42364074e4a3ffec944a96d758cec08da09275ada471fe82c95159af9"

export TSS_E2E_DOCKER_NETWORK="dkg-test"
export NON_INTERACTIVE=1
export FORCE_OVERWRITE=1
export SKIP_NEXT_STEP_HINT=1

mkdir -p "./out/0/keys"

echo "0a20${GUARDIAN_PRIVATE_KEY}" | \
  xxd -r -p | gpg --enarmor | \
  awk 'BEGIN {print "-----BEGIN WORMHOLE GUARDIAN PRIVATE KEY-----"}
    NR>2 {print last}
    {last=$0}
    END {print "-----END WORMHOLE GUARDIAN PRIVATE KEY-----"}' > "./out/0/guardian.pem"

until docker logs peer-server 2>/dev/null | grep "Peer server running on"
do
  sleep 1
done

../../../rollout-scripts/setup-peer.sh \
  "${TLS_HOSTNAME}" \
  "${TLS_PUBLIC_IP}" \
  "./out/0/keys" \
  "./out/0/guardian.pem" \
  "${TLS_PORT}" \
  "${PEER_SERVER_URL}"

../../../rollout-scripts/run-dkg.sh \
  "./out/0/keys" \
  "${TLS_HOSTNAME}" \
  "${TLS_PORT}" \
  "${PEER_SERVER_URL}" \
  "${ETHEREUM_RPC_URL}" \
  "${WORMHOLE_ADDRESS}"

