#!/bin/bash

set -meuo pipefail
export DOCKER_BUILDKIT=1

SIGNER_NAME="Guardian"
SIGNER_PORT=50051
GUARDIAN_NAME="GuardianNode"
WORMHOLE_ADDRESS="0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0"
ETHEREUM_RPC_URL="ws://anvil-with-verifier:8545"
# Guardian 0 Ethereum Address
TSS_LEADER_ADDRESS="0x1bB315E24af6Bb5DaBA538dD17A6168CFA91A213"

NODE_KEYS=(
  "CAESQJq7c6GLNV6UWeaN1AqiaK5D5gWyhDmL1CLemaUAs6ro+sl6H8fM6IlCujbtVoTSFwIA+qccMiMBmANP2PnQMQ0="
  "CAESQPc0SqYu3Mn6dZX0xQSDetUQ2d0tS+WqeuE0o9CyR0gd/a6JSvRj1Lt1pHQY5RQUYU4gJbQrjxoh8quenU6U0mI="
  "CAESQNBr4A1GzHUkYshFWgUZtT+aKNIKs6RteE1BKXLoIa32rgl2F3P3dlpMQD1YIsFdmd+SH0PGWDS7Kc+0CqjUZZo="
  "CAESQK+667FS9GiZCH7tv6AfLI125GoO/Z7Vz4XWOSQZBw5GGaD9cp2fRA3Ts2n+S+DUt15ogOAnnHTLlb2OZZJF1mE="
  "CAESQM9x13ews/BwUXvz8VfIqltuT5I6QaAQqrKG7bBuV/NptvU2aosClpJyv9F9ZJISGKYSuIoFd4IOo693z1V5eaI="
  "CAESQArF4gkb7sVm0whLp3OoBRFDOT7fWKJyoRRLxDi4CWbc+ni3zzIsdWfG+6tRBsBXjf4tYWpUbxEaJ1zYD7k7KMk="
  "CAESQNa/2dn6phbAc2BUF41rfGDqltfkQxn3+R9cmJSvzshl1iErmn55lKtvaX7p2ZjjAiTdMKKOeKRdUM9pcnwZGY4="
  "CAESQEq/UJs/Ef/zC1gSRsMbbgE8UBEpM+mNVHu4RLCO/8IKy6zBDPuC9WwzL38wB95mFtyf6s4AmOufbGUxHMf3Vww="
  "CAESQIGjxYTB1FQIz+fFPubaAD4YONW42NQxqVr0/ChwMQnEG5OorvqucV/nZnnmH5FqVeGU0ldrDWOqJfoBYptk7mU="
  "CAESQI08mKMlqOz6W89pKGlJj7EN5Ukd6HHTuhPr4s7cHStaT2cNR/WMq9pdmCF2JmeswMu3JxI5axNWwkPo/cUMukU="
  "CAESQM2EE1jBHabZSFAAqvEx9nHwplVao153jO/3Ij5uTVUGJVSux/hJDnk8uEBHsPDYd51ERB+7jKCbbPWJllDt5Ig="
  "CAESQDmTvoRSC5X+w3Do9VTE+exmfkA9F49GD2+jOQXgBROqgcWf5/eBx8+i1EMvIBOnZmiQG4QBs+mZ34Vt9qsu9Kg="
  "CAESQHYAUvdMD9zqsenZaJgH06zjVeOaB6oBbtD2I2JxEMA0neAC6pOxZpyrpQ0eJwhYn6VyTvPtsyJTv7fxfpov1ZQ="
  "CAESQP7UyPFYYmkA9b2j6yqf9kwlXTpIVh9C9MHv8OJJkmwZuwXoI9Dg5vU/7u6E2eMJmj3GuXBCyGtfLnlRdhDZ+iU="
  "CAESQOBFCrVhqSkw1qAXPlXUoG6TnHuA7R2vutWQ6KY5ezzEuEM1mfKM7U2nMfCLPvbKpPiiKozjV3O5c718olgV69o="
  "CAESQB7H4jDfUHVrdTeaIOij/P+D80dYAxbcS169hPPXoPtIJkqwOonIzS6sH+v9Wm/M3eM0h1YOGtmuJ5Gqm+6e1/c="
  "CAESQBfpndb9ZsZv26XKTKykjlRE6LUFEy7sTLPfgvNowheeQ00wqls5TSwGTx1qaYV2cB/5AAuGCSCU4Ogf1jpvnz4="
  "CAESQHaCB/ix9Psiih+GH9eNSKLUJTEngQBuP3G7uutdK2b6DPSemLy4hCMz+y5urXnZrpQdXRFPbx1tJx2C2kb0jfM="
  "CAESQHyZu7pLvoPW5M7Ld122guz87IAa/c5mm2DrOm/n71xNdoQGHQGed9il4Wo7NFJYsqEMlL5aSzvZ6ekVCDs5XXE="
)

PEER_IDS=(
  "12D3KooWShLHE6mjhHERNtKCCGx9dmuNshk2PWj5bV3BhzJcxH64"
  "12D3KooWStdgE8KU8MFddBzWfzRrb3wh2DC3NBRmaEqkQxMB6SHP"
  "12D3KooWMXjUYySJPgb8jsoWGjoEF558W2Hkp7oPgLaC2k1w8K2Z"
  "12D3KooWBYQjyB67NRvMwFqDF7TztYfqQrTZA6Mx7VE3yTNfNgac"
  "12D3KooWN8ZEhePzLtFgo9xnaZF4gkid2UTfmHiDProSTgSdVXBf"
  "12D3KooWSg6rekbeUqs9VBNRAdCRR9mW31NoDk2mHtTUeG9uLk6c"
  "12D3KooWQEEkaSPQ8DTMHEZRvhBcuSmKKDbrDUo9ZizxuMn5wruK"
  "12D3KooWPXRiV5rRvEhpUXT9qrBUBv8SRkmYPWi8VXBJCVwCEgGs"
  "12D3KooWBg1mSGGiiowPF2SptQxR2zKnQM4ttewrs4ofw1n3Gp1r"
  "12D3KooWFAKWutQK2d7eEeiuFiTERdLHFvXF58G29iZNWGfZEuue"
  "12D3KooWCL69WM2298L2CMSSzoPv7bERiH33L5aQNmxPBFRVPspj"
  "12D3KooWJYwYPhw63ACpFnAvAFwvAhGEv7Av5gFsz2Gw4tn2o15Z"
  "12D3KooWLSeJ1qeBvH3u13dhj1T8f4D9Gx41y4higxqheb1hekhq"
  "12D3KooWNQRddHWNBkxitigib2zZSiaRQtsnXwhfx3ci56nJuYYt"
  "12D3KooWNDedEV9qAitCUJdFFfuycZMnB79QL5mTADnWkRxdZPjX"
  "12D3KooWCPqiVH3MatfQSyxCHj3jJ4yqwLWQtbr9vrxTZqD6aHk2"
  "12D3KooWEM5kZZcF763Sa4kjDnjDirHjS1JkP4UqSVkzUC4DADhw"
  "12D3KooWAgwQP4LeYEzC9iNXWxJvtf236bT67b32b8qnqSHNxG42"
  "12D3KooWHo13FvSEYvhv7NJ7nBUFkqnrMgPieCHuKiCEmpHxVir4"
)

createBootstrapPeers() {
  for i in "${!PEER_IDS[@]}"
  do
    echo /dns4/${GUARDIAN_NAME}$i/udp/8999/quic-v1/p2p/${PEER_IDS[$i]}
  done | paste -sd "," -
}

docker build --tag dkg-guardian --file ./guardian.Dockerfile --progress=plain .

for i in "${!NODE_KEYS[@]}"
do
  base64 --decode <(echo ${NODE_KEYS[$i]}) > ./out/$i/keys/nodeKey
  # Wait until the signer starts listening
  # TODO: There is a good chance this can be removed
  until docker logs "${SIGNER_NAME}$i" 2>&1 | grep "Server is running"
  do
    sleep 1
  done
  docker run --rm --name "${GUARDIAN_NAME}$i" \
    --user $(id --user) --network=dkg-test \
    --mount "type=bind,src=./out/$i/keys,dst=/keys" \
    dkg-guardian \
    --ethRPC "${ETHEREUM_RPC_URL}" \
    --ethContract "${WORMHOLE_ADDRESS}" \
    --tssLeaderAddress "${TSS_LEADER_ADDRESS}" \
    --tssSignerAddress "${SIGNER_NAME}$i:${SIGNER_PORT}" \
    --bootstrap $(createBootstrapPeers) &
done

wait
