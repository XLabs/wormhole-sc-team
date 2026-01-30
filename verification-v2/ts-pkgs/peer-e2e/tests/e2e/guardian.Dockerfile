FROM golang:1.25.6-trixie@sha256:fb4b74a39c7318d53539ebda43ccd3ecba6e447a78591889c0efc0a7235ea8b3

RUN apt-get --quiet update && apt-get --quiet --no-install-recommends --yes install \
  ca-certificates \
  && rm -rf /var/lib/apt/lists

# TODO: Pin the commit
RUN git clone -b tss-develop --depth 1 https://github.com/XLabs/wormhole-sc-team.git

RUN nc -lkU adminSocket.sock &

WORKDIR /go/wormhole-sc-team/

RUN make node

ENTRYPOINT [ \
  "/go/wormhole-sc-team/build/bin/guardiand", "node", \
  "--testnetMode", \
  "--disableTelemetry", \
  "--nodeKey", "/keys/nodeKey", \
  "--guardianKey", "/keys/guardian.pem", \
  "--tssTLSKey", "/keys/key.pem", \
  "--tssTLSCert", "/keys/cert.pem", \
  "--adminSocket", "/go/adminSocket.sock", \
  "--dataDir", "/go/", \
  "--ethRPC", "ws://anvil-with-verifier:8545",\
  "--ethContract", "0x5FbDB2315678afecb367f032d93F642f64180aa3" \
]
