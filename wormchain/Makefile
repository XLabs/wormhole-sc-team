PROTO_FILES=$(shell find proto -name "*.proto")
GO_FILES=$(shell find . -name "*.go")
# Address of the main tilt validator that the others should connect to
TILT_VALADDRESS=wormholevaloper1cyyzpxplxdzkeea7kwsydadg87357qna87hzv8

VERSION := $(shell echo $(shell git describe --tags 2> /dev/null || echo v0.0.1))
COMMIT := $(shell git log -1 --format='%h' 2> /dev/null || echo 'abc123')

ldflags = \
    -X github.com/cosmos/cosmos-sdk/version.Name=wormchain\
	-X github.com/cosmos/cosmos-sdk/version.ServerName=wormchaind\
	-X github.com/cosmos/cosmos-sdk/version.Version=$(VERSION) \
	-X github.com/cosmos/cosmos-sdk/version.Commit=$(COMMIT) \
	-X "github.com/cosmos/cosmos-sdk/version.BuildTags=ledger"
BUILD_FLAGS := -ldflags '$(ldflags)'

.PHONY: all
all: client

.PHONY: client build/wormchaind
client: build/wormchaind


build/wormchaind: cmd/wormchaind/main.go $(GO_FILES)
	@echo building "wormchaind-$(VERSION)"
	go build -v $(BUILD_FLAGS) -tags ledger -o $@ $<
	cp "$@" "$@"-"$(VERSION)"

# proto: $(PROTO_FILES)
# 	DOCKER_BUILDKIT=1 docker build --target go-export -f Dockerfile.proto -o type=local,dest=. ..

# vue: $(GO_FILES) proto
# 	mkdir -p $@
# 	touch -m $@
# 	DOCKER_BUILDKIT=1 docker build --target vue-export -f Dockerfile.proto -o type=local,dest=. ..

# For now this is a phony target so we just rebuild it each time instead of
# tracking dependencies
.PHONY: ts-sdk
ts-sdk: vue
	npm ci --prefix $@
	npm run build --prefix $@

.PHONY: run
run: build/wormchaind
	./$< start --home build  --log_level="debug"

# get npm packages for contracts/tools
contracts-tools-deps: contracts/tools/package-lock.json
	npm ci --prefix=contracts/tools

# get .env and devnet-consts.json for contracts/tools
contracts-devnet-env:
	cd .. && ./scripts/guardian-set-init.sh 1
	cd .. && ./scripts/distribute-devnet-consts.sh

# get wasm artifacts for cosmwasm contracts
contracts-artifacts:
	cd ../cosmwasm && $(MAKE) artifacts
	cp -r ../cosmwasm/artifacts contracts

# get everything needed to
contracts-deploy-setup: contracts-tools-deps contracts-devnet-env contracts-artifacts

# runs the contract deployment script
contracts-deploy-local: contracts-deploy-setup
	npm run deploy-wormchain --prefix=contracts/tools

.PHONY: test
test:
	go test -v ./...

.PHONY: bootstrap
bootstrap:
	npm run bootstrap --prefix testing/js

.PHONY: clean
clean:
	rm -rf build/wormchaind build/wormchaind-* build/**/*.db build/**/*.wal vue
	echo "{\"height\":\"0\",\"round\":0,\"step\":0}" > build/data/priv_validator_state.json

#####################
## INTERCHAINTESTS ##
#####################

# Generate Wormchain Image
local-image: build/wormchaind
	docker build -t wormchain:local -f Dockerfile.ict ..

# Individual Tests ($$ is interpreted as $)
rm-testcache:
	go clean -testcache
.PHONY: rm-testcache

ictest-cancel-upgrade: rm-testcache
	cd interchaintest && go test -race -v -run ^TestCancelUpgrade$$ ./...
.PHONY: ictest-cancel-upgrade

ictest-malformed-payload: rm-testcache
	cd interchaintest && go test -race -v -run ^TestMalformedPayload$$ ./...
.PHONY: ictest-malformed-payload

ictest-slashing-params-update-vaa: rm-testcache
	cd interchaintest && go test -race -v -run ^TestSlashingParamsUpdateVaa$$ ./...
.PHONY: ictest-slashing-params-update-vaa

ictest-upgrade-failure: rm-testcache
	cd interchaintest && go test -race -v -run ^TestUpgradeFailure$$ ./...
.PHONY: ictest-upgrade-failure

ictest-upgrade: rm-testcache
	cd interchaintest && go test -race -v -run ^TestUpgrade$$ ./...
.PHONY: ictest-upgrade

ictest-wormchain: rm-testcache
	cd interchaintest && go test -race -v -run ^TestWormchain$$ ./...
.PHONY: ictest-wormchain

ictest-ibc-receiver: rm-testcache
	cd interchaintest && go test -race -v -run ^TestIbcReceiver ./...
.PHONY: ictest-ibc-receiver

ictest-cw-wormhole: rm-testcache
	cd interchaintest && go test -race -v -run ^TestCWWormhole ./...
.PHONY: ictest-cw-wormhole

ictest-cw-shutdown-contracts: rm-testcache
	cd interchaintest && go test -race -v -run ^TestShutdown ./...
.PHONY: ictest-cw-shutdown-contracts

ictest-cw-shutdown-contracts: rm-testcache
	cd interchaintest && go test -race -v -run ^TestShutdown ./...

ictest-validator-hotswap: rm-testcache
	cd interchaintest && go test -race -v -run ^TestValidatorHotswap$$ ./...
.PHONY: ictest-validator-hotswap

