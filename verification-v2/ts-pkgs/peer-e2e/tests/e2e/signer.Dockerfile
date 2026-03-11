FROM golang:1.25.6-trixie@sha256:fb4b74a39c7318d53539ebda43ccd3ecba6e447a78591889c0efc0a7235ea8b3

RUN apt-get --quiet update && apt-get --quiet --no-install-recommends --yes install \
  ca-certificates \
  && rm -rf /var/lib/apt/lists

# TODO: Pin the commit
RUN git clone -b tss-server --depth 1 https://github.com/XLabs/tss-lib.git

WORKDIR /go/tss-lib/service/

RUN go build

ENTRYPOINT ["/go/tss-lib/service/service", "-s", "/keys/secrets.json", "-socket", "0.0.0.0:50051"]
