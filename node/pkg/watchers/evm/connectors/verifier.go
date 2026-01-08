package connectors

import (
	"context"
	"time"

	ethVerifier "github.com/certusone/wormhole/node/pkg/watchers/evm/connectors/verifier"

	ethRpc "github.com/ethereum/go-ethereum/rpc"

	ethereum "github.com/ethereum/go-ethereum"
	ethBind "github.com/ethereum/go-ethereum/accounts/abi/bind"
	ethCommon "github.com/ethereum/go-ethereum/common"
	ethTypes "github.com/ethereum/go-ethereum/core/types"
	ethClient "github.com/ethereum/go-ethereum/ethclient"
	ethEvent "github.com/ethereum/go-ethereum/event"

	"go.uber.org/zap"
)

type VerifierBaseConnector struct {
	networkName string
	address     ethCommon.Address
	logger      *zap.Logger
	client      *ethClient.Client
	rawClient   *ethRpc.Client
	filterer    *ethVerifier.AbiFilterer
	caller      *ethVerifier.AbiCaller
}

func NewVerifierBaseConnector(ctx context.Context, networkName, rawUrl string, address ethCommon.Address, logger *zap.Logger) (*VerifierBaseConnector, error) {
	rawClient, err := ethRpc.DialContext(ctx, rawUrl)
	if err != nil {
		return nil, err
	}

	client := ethClient.NewClient(rawClient)

	filterer, err := ethVerifier.NewWormholeVerifierFilterer(ethCommon.BytesToAddress(address.Bytes()), client)
	if err != nil {
		panic(err)
	}
	caller, err := ethVerifier.NewWormholeVerifierCaller(ethCommon.BytesToAddress(address.Bytes()), client)
	if err != nil {
		panic(err)
	}

	return &VerifierBaseConnector{
		networkName: networkName,
		address:     address,
		logger:      logger,
		client:      client,
		filterer:    filterer,
		caller:      caller,
		rawClient:   rawClient,
	}, nil
}

func (v *VerifierBaseConnector) NetworkName() string {
	return v.networkName
}

func (v *VerifierBaseConnector) ContractAddress() ethCommon.Address {
	return v.address
}

func (v *VerifierBaseConnector) TransactionReceipt(ctx context.Context, txHash ethCommon.Hash) (*ethTypes.Receipt, error) {
	return v.client.TransactionReceipt(ctx, txHash)
}

func (v *VerifierBaseConnector) TimeOfBlockByHash(ctx context.Context, hash ethCommon.Hash) (uint64, error) {
	block, err := v.client.HeaderByHash(ctx, hash)
	if err != nil {
		return 0, err
	}

	return block.Time, err
}

func (v *VerifierBaseConnector) SubscribeForBlocks(ctx context.Context, errC chan error, sink chan<- *NewBlock) (ethereum.Subscription, error) {
	panic("not implemented")
}

func (v *VerifierBaseConnector) GetLatest(ctx context.Context) (latest, finalized, safe uint64, err error) {
	panic("not implemented")
}

func (v *VerifierBaseConnector) RawCallContext(ctx context.Context, result interface{}, method string, args ...interface{}) error {
	return v.rawClient.CallContext(ctx, result, method, args...)
}

func (v *VerifierBaseConnector) RawBatchCallContext(ctx context.Context, b []ethRpc.BatchElem) error {
	return v.rawClient.BatchCallContext(ctx, b)
}

func (v *VerifierBaseConnector) Client() *ethClient.Client {
	return v.client
}

func (v *VerifierBaseConnector) SubscribeNewHead(ctx context.Context, ch chan<- *ethTypes.Header) (ethereum.Subscription, error) {
	return v.client.SubscribeNewHead(ctx, ch)
}

func (v *VerifierBaseConnector) GetCurrentSchnorrShardData(ctx context.Context) ([]byte, error) {
	var GET_CURRENT_SCHNORR_SHARD_DATA_ID = 0x05
	var data = [1]byte{GET_CURRENT_SCHNORR_SHARD_DATA_ID}
	return v.caller.Get(&ethBind.CallOpts{Context: ctx}, data)
}

func (v *VerifierBaseConnector) WatchShardIdUpdated(ctx context.Context, _ chan error, sink chan<- *ethVerifier.WormholeVerifierShardIdUpdated) (ethEvent.Subscription, error) {
	timeout, cancel := context.WithTimeout(ctx, 15*time.Second)
	defer cancel()
	return v.filterer.WatchShardIdUpdated(&ethBind.WatchOpts{Context: timeout}, sink, nil, nil)
}

func (v *VerifierBaseConnector) ParseShardIdUpdated(log ethTypes.Log) (*ethVerifier.WormholeVerifierShardIdUpdated, error) {
	return v.filterer.ParseShardIdUpdated(log)
}