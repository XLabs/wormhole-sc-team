# syntax=docker.io/docker/dockerfile:1.3@sha256:42399d4635eddd7a9b8a24be879d2f9a930d0ed040a61324cfdf59ef1357b3b2

FROM docker.io/golang:1.25.6-trixie@sha256:fb4b74a39c7318d53539ebda43ccd3ecba6e447a78591889c0efc0a7235ea8b3

RUN apt-get --quiet update && apt-get --quiet --no-install-recommends --yes install \
  ca-certificates \
  && rm -rf /var/lib/apt/lists

# We assume that protobuf definitions are up to date here
# See `generate` recipe in root Makefile.

RUN mkdir /guardian
WORKDIR /guardian

COPY node node
COPY sdk sdk
COPY wormchain wormchain

RUN \
  export CGO_ENABLED=1 && \
  cd node && \
  go build -mod=readonly -o /guardian/guardiand github.com/certusone/wormhole/node

RUN useradd -r -u 10001 -g root appuser
USER appuser

ENTRYPOINT [ \
  "/guardian/guardiand", "node", \
  "--testnetMode", \
  "--disableTelemetry", \
  "--nodeKey", "/keys/nodeKey", \
  "--guardianKey", "/keys/guardian.pem", \
  "--tssTLSKey", "/keys/key.pem", \
  "--tssTLSCert", "/keys/cert.pem", \
  "--adminSocket", "/go/adminSocket.sock", \
  "--dataDir", "/go/", \
  "--publicGRPCSocket", "/go/grpcSocket.sock", \
  "--publicWeb", "0.0.0.0:8081" \
]
