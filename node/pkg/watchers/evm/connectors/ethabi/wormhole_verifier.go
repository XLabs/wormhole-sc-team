// Code generated - DO NOT EDIT.
// This file is a generated binding and any manual changes will be lost.

package verifier

import (
	"errors"
	"math/big"
	"strings"

	ethereum "github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/event"
)

// Reference imports to suppress errors if they are not otherwise used.
var (
	_ = errors.New
	_ = big.NewInt
	_ = strings.NewReader
	_ = ethereum.NotFound
	_ = bind.Bind
	_ = common.Big1
	_ = types.BloomLookup
	_ = event.NewSubscription
	_ = abi.ConvertType
)

// WormholeVerifierMetaData contains all meta data concerning the WormholeVerifier contract.
var WormholeVerifierMetaData = &bind.MetaData{
	ABI: "[{\"type\":\"constructor\",\"inputs\":[{\"name\":\"coreBridge\",\"type\":\"address\",\"internalType\":\"contractICoreBridge\"},{\"name\":\"initialMultisigKeyCount\",\"type\":\"uint32\",\"internalType\":\"uint32\"},{\"name\":\"initialSchnorrKeyCount\",\"type\":\"uint32\",\"internalType\":\"uint32\"},{\"name\":\"initialMultisigKeyPullLimit\",\"type\":\"uint32\",\"internalType\":\"uint32\"},{\"name\":\"appendSchnorrKeyVaa\",\"type\":\"bytes\",\"internalType\":\"bytes\"}],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"DOMAIN_SEPARATOR\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"eip712Domain\",\"inputs\":[],\"outputs\":[{\"name\":\"fields\",\"type\":\"bytes1\",\"internalType\":\"bytes1\"},{\"name\":\"name\",\"type\":\"string\",\"internalType\":\"string\"},{\"name\":\"version\",\"type\":\"string\",\"internalType\":\"string\"},{\"name\":\"chainId\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"verifyingContract\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"salt\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"extensions\",\"type\":\"uint256[]\",\"internalType\":\"uint256[]\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"get\",\"inputs\":[{\"name\":\"data\",\"type\":\"bytes\",\"internalType\":\"bytes\"}],\"outputs\":[{\"name\":\"\",\"type\":\"bytes\",\"internalType\":\"bytes\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getRegisterGuardianDigest\",\"inputs\":[{\"name\":\"thresholdKeyIndex\",\"type\":\"uint32\",\"internalType\":\"uint32\"},{\"name\":\"nonce\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"guardianId\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"}],\"outputs\":[{\"name\":\"\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"update\",\"inputs\":[{\"name\":\"data\",\"type\":\"bytes\",\"internalType\":\"bytes\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"verify\",\"inputs\":[{\"name\":\"data\",\"type\":\"bytes\",\"internalType\":\"bytes\"}],\"outputs\":[{\"name\":\"emitterChainId\",\"type\":\"uint16\",\"internalType\":\"uint16\"},{\"name\":\"emitterAddress\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"sequence\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"payloadOffset\",\"type\":\"uint16\",\"internalType\":\"uint16\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"verifyBatch\",\"inputs\":[],\"outputs\":[],\"stateMutability\":\"view\"},{\"type\":\"event\",\"name\":\"MultisigKeyDataPulled\",\"inputs\":[{\"name\":\"newMultisigKeyIndex\",\"type\":\"uint256\",\"indexed\":true,\"internalType\":\"uint256\"},{\"name\":\"oldMultisigKeyIndex\",\"type\":\"uint256\",\"indexed\":true,\"internalType\":\"uint256\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"SchnorrKeyAdded\",\"inputs\":[{\"name\":\"newSchnorrKeyIndex\",\"type\":\"uint32\",\"indexed\":true,\"internalType\":\"uint32\"},{\"name\":\"newSchnorrKey\",\"type\":\"uint256\",\"indexed\":false,\"internalType\":\"uint256\"},{\"name\":\"initialShardDataHash\",\"type\":\"bytes32\",\"indexed\":false,\"internalType\":\"bytes32\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"ShardIdUpdated\",\"inputs\":[{\"name\":\"schnorrKeyIndex\",\"type\":\"uint32\",\"indexed\":true,\"internalType\":\"uint32\"},{\"name\":\"signerIndex\",\"type\":\"uint8\",\"indexed\":true,\"internalType\":\"uint8\"},{\"name\":\"oldPubKeyX\",\"type\":\"bytes32\",\"indexed\":false,\"internalType\":\"bytes32\"},{\"name\":\"oldPubKeyY\",\"type\":\"bytes32\",\"indexed\":false,\"internalType\":\"bytes32\"},{\"name\":\"newPubKeyX\",\"type\":\"bytes32\",\"indexed\":false,\"internalType\":\"bytes32\"},{\"name\":\"newPubKeyY\",\"type\":\"bytes32\",\"indexed\":false,\"internalType\":\"bytes32\"}],\"anonymous\":false},{\"type\":\"error\",\"name\":\"GetFailed\",\"inputs\":[{\"name\":\"result\",\"type\":\"uint256\",\"internalType\":\"uint256\"}]},{\"type\":\"error\",\"name\":\"GovernanceVaaVerificationFailure\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"UnknownGuardianSet\",\"inputs\":[{\"name\":\"index\",\"type\":\"uint32\",\"internalType\":\"uint32\"}]},{\"type\":\"error\",\"name\":\"UpdateFailed\",\"inputs\":[{\"name\":\"result\",\"type\":\"uint256\",\"internalType\":\"uint256\"}]},{\"type\":\"error\",\"name\":\"VerificationFailed\",\"inputs\":[{\"name\":\"result\",\"type\":\"uint256\",\"internalType\":\"uint256\"}]}]",
}

// WormholeVerifierABI is the input ABI used to generate the binding from.
// Deprecated: Use WormholeVerifierMetaData.ABI instead.
var WormholeVerifierABI = WormholeVerifierMetaData.ABI

// WormholeVerifier is an auto generated Go binding around an Ethereum contract.
type WormholeVerifier struct {
	WormholeVerifierCaller     // Read-only binding to the contract
	WormholeVerifierTransactor // Write-only binding to the contract
	WormholeVerifierFilterer   // Log filterer for contract events
}

// WormholeVerifierCaller is an auto generated read-only Go binding around an Ethereum contract.
type WormholeVerifierCaller struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// WormholeVerifierTransactor is an auto generated write-only Go binding around an Ethereum contract.
type WormholeVerifierTransactor struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// WormholeVerifierFilterer is an auto generated log filtering Go binding around an Ethereum contract events.
type WormholeVerifierFilterer struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// WormholeVerifierSession is an auto generated Go binding around an Ethereum contract,
// with pre-set call and transact options.
type WormholeVerifierSession struct {
	Contract     *WormholeVerifier // Generic contract binding to set the session for
	CallOpts     bind.CallOpts     // Call options to use throughout this session
	TransactOpts bind.TransactOpts // Transaction auth options to use throughout this session
}

// WormholeVerifierCallerSession is an auto generated read-only Go binding around an Ethereum contract,
// with pre-set call options.
type WormholeVerifierCallerSession struct {
	Contract *WormholeVerifierCaller // Generic contract caller binding to set the session for
	CallOpts bind.CallOpts           // Call options to use throughout this session
}

// WormholeVerifierTransactorSession is an auto generated write-only Go binding around an Ethereum contract,
// with pre-set transact options.
type WormholeVerifierTransactorSession struct {
	Contract     *WormholeVerifierTransactor // Generic contract transactor binding to set the session for
	TransactOpts bind.TransactOpts           // Transaction auth options to use throughout this session
}

// WormholeVerifierRaw is an auto generated low-level Go binding around an Ethereum contract.
type WormholeVerifierRaw struct {
	Contract *WormholeVerifier // Generic contract binding to access the raw methods on
}

// WormholeVerifierCallerRaw is an auto generated low-level read-only Go binding around an Ethereum contract.
type WormholeVerifierCallerRaw struct {
	Contract *WormholeVerifierCaller // Generic read-only contract binding to access the raw methods on
}

// WormholeVerifierTransactorRaw is an auto generated low-level write-only Go binding around an Ethereum contract.
type WormholeVerifierTransactorRaw struct {
	Contract *WormholeVerifierTransactor // Generic write-only contract binding to access the raw methods on
}

// NewWormholeVerifier creates a new instance of WormholeVerifier, bound to a specific deployed contract.
func NewWormholeVerifier(address common.Address, backend bind.ContractBackend) (*WormholeVerifier, error) {
	contract, err := bindWormholeVerifier(address, backend, backend, backend)
	if err != nil {
		return nil, err
	}
	return &WormholeVerifier{WormholeVerifierCaller: WormholeVerifierCaller{contract: contract}, WormholeVerifierTransactor: WormholeVerifierTransactor{contract: contract}, WormholeVerifierFilterer: WormholeVerifierFilterer{contract: contract}}, nil
}

// NewWormholeVerifierCaller creates a new read-only instance of WormholeVerifier, bound to a specific deployed contract.
func NewWormholeVerifierCaller(address common.Address, caller bind.ContractCaller) (*WormholeVerifierCaller, error) {
	contract, err := bindWormholeVerifier(address, caller, nil, nil)
	if err != nil {
		return nil, err
	}
	return &WormholeVerifierCaller{contract: contract}, nil
}

// NewWormholeVerifierTransactor creates a new write-only instance of WormholeVerifier, bound to a specific deployed contract.
func NewWormholeVerifierTransactor(address common.Address, transactor bind.ContractTransactor) (*WormholeVerifierTransactor, error) {
	contract, err := bindWormholeVerifier(address, nil, transactor, nil)
	if err != nil {
		return nil, err
	}
	return &WormholeVerifierTransactor{contract: contract}, nil
}

// NewWormholeVerifierFilterer creates a new log filterer instance of WormholeVerifier, bound to a specific deployed contract.
func NewWormholeVerifierFilterer(address common.Address, filterer bind.ContractFilterer) (*WormholeVerifierFilterer, error) {
	contract, err := bindWormholeVerifier(address, nil, nil, filterer)
	if err != nil {
		return nil, err
	}
	return &WormholeVerifierFilterer{contract: contract}, nil
}

// bindWormholeVerifier binds a generic wrapper to an already deployed contract.
func bindWormholeVerifier(address common.Address, caller bind.ContractCaller, transactor bind.ContractTransactor, filterer bind.ContractFilterer) (*bind.BoundContract, error) {
	parsed, err := WormholeVerifierMetaData.GetAbi()
	if err != nil {
		return nil, err
	}
	return bind.NewBoundContract(address, *parsed, caller, transactor, filterer), nil
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_WormholeVerifier *WormholeVerifierRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _WormholeVerifier.Contract.WormholeVerifierCaller.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_WormholeVerifier *WormholeVerifierRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _WormholeVerifier.Contract.WormholeVerifierTransactor.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_WormholeVerifier *WormholeVerifierRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _WormholeVerifier.Contract.WormholeVerifierTransactor.contract.Transact(opts, method, params...)
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_WormholeVerifier *WormholeVerifierCallerRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _WormholeVerifier.Contract.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_WormholeVerifier *WormholeVerifierTransactorRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _WormholeVerifier.Contract.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_WormholeVerifier *WormholeVerifierTransactorRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _WormholeVerifier.Contract.contract.Transact(opts, method, params...)
}

// DOMAINSEPARATOR is a free data retrieval call binding the contract method 0x3644e515.
//
// Solidity: function DOMAIN_SEPARATOR() view returns(bytes32)
func (_WormholeVerifier *WormholeVerifierCaller) DOMAINSEPARATOR(opts *bind.CallOpts) ([32]byte, error) {
	var out []interface{}
	err := _WormholeVerifier.contract.Call(opts, &out, "DOMAIN_SEPARATOR")

	if err != nil {
		return *new([32]byte), err
	}

	out0 := *abi.ConvertType(out[0], new([32]byte)).(*[32]byte)

	return out0, err

}

// DOMAINSEPARATOR is a free data retrieval call binding the contract method 0x3644e515.
//
// Solidity: function DOMAIN_SEPARATOR() view returns(bytes32)
func (_WormholeVerifier *WormholeVerifierSession) DOMAINSEPARATOR() ([32]byte, error) {
	return _WormholeVerifier.Contract.DOMAINSEPARATOR(&_WormholeVerifier.CallOpts)
}

// DOMAINSEPARATOR is a free data retrieval call binding the contract method 0x3644e515.
//
// Solidity: function DOMAIN_SEPARATOR() view returns(bytes32)
func (_WormholeVerifier *WormholeVerifierCallerSession) DOMAINSEPARATOR() ([32]byte, error) {
	return _WormholeVerifier.Contract.DOMAINSEPARATOR(&_WormholeVerifier.CallOpts)
}

// Eip712Domain is a free data retrieval call binding the contract method 0x84b0196e.
//
// Solidity: function eip712Domain() view returns(bytes1 fields, string name, string version, uint256 chainId, address verifyingContract, bytes32 salt, uint256[] extensions)
func (_WormholeVerifier *WormholeVerifierCaller) Eip712Domain(opts *bind.CallOpts) (struct {
	Fields            [1]byte
	Name              string
	Version           string
	ChainId           *big.Int
	VerifyingContract common.Address
	Salt              [32]byte
	Extensions        []*big.Int
}, error) {
	var out []interface{}
	err := _WormholeVerifier.contract.Call(opts, &out, "eip712Domain")

	outstruct := new(struct {
		Fields            [1]byte
		Name              string
		Version           string
		ChainId           *big.Int
		VerifyingContract common.Address
		Salt              [32]byte
		Extensions        []*big.Int
	})
	if err != nil {
		return *outstruct, err
	}

	outstruct.Fields = *abi.ConvertType(out[0], new([1]byte)).(*[1]byte)
	outstruct.Name = *abi.ConvertType(out[1], new(string)).(*string)
	outstruct.Version = *abi.ConvertType(out[2], new(string)).(*string)
	outstruct.ChainId = *abi.ConvertType(out[3], new(*big.Int)).(**big.Int)
	outstruct.VerifyingContract = *abi.ConvertType(out[4], new(common.Address)).(*common.Address)
	outstruct.Salt = *abi.ConvertType(out[5], new([32]byte)).(*[32]byte)
	outstruct.Extensions = *abi.ConvertType(out[6], new([]*big.Int)).(*[]*big.Int)

	return *outstruct, err

}

// Eip712Domain is a free data retrieval call binding the contract method 0x84b0196e.
//
// Solidity: function eip712Domain() view returns(bytes1 fields, string name, string version, uint256 chainId, address verifyingContract, bytes32 salt, uint256[] extensions)
func (_WormholeVerifier *WormholeVerifierSession) Eip712Domain() (struct {
	Fields            [1]byte
	Name              string
	Version           string
	ChainId           *big.Int
	VerifyingContract common.Address
	Salt              [32]byte
	Extensions        []*big.Int
}, error) {
	return _WormholeVerifier.Contract.Eip712Domain(&_WormholeVerifier.CallOpts)
}

// Eip712Domain is a free data retrieval call binding the contract method 0x84b0196e.
//
// Solidity: function eip712Domain() view returns(bytes1 fields, string name, string version, uint256 chainId, address verifyingContract, bytes32 salt, uint256[] extensions)
func (_WormholeVerifier *WormholeVerifierCallerSession) Eip712Domain() (struct {
	Fields            [1]byte
	Name              string
	Version           string
	ChainId           *big.Int
	VerifyingContract common.Address
	Salt              [32]byte
	Extensions        []*big.Int
}, error) {
	return _WormholeVerifier.Contract.Eip712Domain(&_WormholeVerifier.CallOpts)
}

// Get is a free data retrieval call binding the contract method 0xd6d7d525.
//
// Solidity: function get(bytes data) view returns(bytes)
func (_WormholeVerifier *WormholeVerifierCaller) Get(opts *bind.CallOpts, data []byte) ([]byte, error) {
	var out []interface{}
	err := _WormholeVerifier.contract.Call(opts, &out, "get", data)

	if err != nil {
		return *new([]byte), err
	}

	out0 := *abi.ConvertType(out[0], new([]byte)).(*[]byte)

	return out0, err

}

// Get is a free data retrieval call binding the contract method 0xd6d7d525.
//
// Solidity: function get(bytes data) view returns(bytes)
func (_WormholeVerifier *WormholeVerifierSession) Get(data []byte) ([]byte, error) {
	return _WormholeVerifier.Contract.Get(&_WormholeVerifier.CallOpts, data)
}

// Get is a free data retrieval call binding the contract method 0xd6d7d525.
//
// Solidity: function get(bytes data) view returns(bytes)
func (_WormholeVerifier *WormholeVerifierCallerSession) Get(data []byte) ([]byte, error) {
	return _WormholeVerifier.Contract.Get(&_WormholeVerifier.CallOpts, data)
}

// GetRegisterGuardianDigest is a free data retrieval call binding the contract method 0xa70e6236.
//
// Solidity: function getRegisterGuardianDigest(uint32 thresholdKeyIndex, uint256 nonce, bytes32 guardianId) view returns(bytes32)
func (_WormholeVerifier *WormholeVerifierCaller) GetRegisterGuardianDigest(opts *bind.CallOpts, thresholdKeyIndex uint32, nonce *big.Int, guardianId [32]byte) ([32]byte, error) {
	var out []interface{}
	err := _WormholeVerifier.contract.Call(opts, &out, "getRegisterGuardianDigest", thresholdKeyIndex, nonce, guardianId)

	if err != nil {
		return *new([32]byte), err
	}

	out0 := *abi.ConvertType(out[0], new([32]byte)).(*[32]byte)

	return out0, err

}

// GetRegisterGuardianDigest is a free data retrieval call binding the contract method 0xa70e6236.
//
// Solidity: function getRegisterGuardianDigest(uint32 thresholdKeyIndex, uint256 nonce, bytes32 guardianId) view returns(bytes32)
func (_WormholeVerifier *WormholeVerifierSession) GetRegisterGuardianDigest(thresholdKeyIndex uint32, nonce *big.Int, guardianId [32]byte) ([32]byte, error) {
	return _WormholeVerifier.Contract.GetRegisterGuardianDigest(&_WormholeVerifier.CallOpts, thresholdKeyIndex, nonce, guardianId)
}

// GetRegisterGuardianDigest is a free data retrieval call binding the contract method 0xa70e6236.
//
// Solidity: function getRegisterGuardianDigest(uint32 thresholdKeyIndex, uint256 nonce, bytes32 guardianId) view returns(bytes32)
func (_WormholeVerifier *WormholeVerifierCallerSession) GetRegisterGuardianDigest(thresholdKeyIndex uint32, nonce *big.Int, guardianId [32]byte) ([32]byte, error) {
	return _WormholeVerifier.Contract.GetRegisterGuardianDigest(&_WormholeVerifier.CallOpts, thresholdKeyIndex, nonce, guardianId)
}

// Verify is a free data retrieval call binding the contract method 0x8e760afe.
//
// Solidity: function verify(bytes data) view returns(uint16 emitterChainId, bytes32 emitterAddress, uint64 sequence, uint16 payloadOffset)
func (_WormholeVerifier *WormholeVerifierCaller) Verify(opts *bind.CallOpts, data []byte) (struct {
	EmitterChainId uint16
	EmitterAddress [32]byte
	Sequence       uint64
	PayloadOffset  uint16
}, error) {
	var out []interface{}
	err := _WormholeVerifier.contract.Call(opts, &out, "verify", data)

	outstruct := new(struct {
		EmitterChainId uint16
		EmitterAddress [32]byte
		Sequence       uint64
		PayloadOffset  uint16
	})
	if err != nil {
		return *outstruct, err
	}

	outstruct.EmitterChainId = *abi.ConvertType(out[0], new(uint16)).(*uint16)
	outstruct.EmitterAddress = *abi.ConvertType(out[1], new([32]byte)).(*[32]byte)
	outstruct.Sequence = *abi.ConvertType(out[2], new(uint64)).(*uint64)
	outstruct.PayloadOffset = *abi.ConvertType(out[3], new(uint16)).(*uint16)

	return *outstruct, err

}

// Verify is a free data retrieval call binding the contract method 0x8e760afe.
//
// Solidity: function verify(bytes data) view returns(uint16 emitterChainId, bytes32 emitterAddress, uint64 sequence, uint16 payloadOffset)
func (_WormholeVerifier *WormholeVerifierSession) Verify(data []byte) (struct {
	EmitterChainId uint16
	EmitterAddress [32]byte
	Sequence       uint64
	PayloadOffset  uint16
}, error) {
	return _WormholeVerifier.Contract.Verify(&_WormholeVerifier.CallOpts, data)
}

// Verify is a free data retrieval call binding the contract method 0x8e760afe.
//
// Solidity: function verify(bytes data) view returns(uint16 emitterChainId, bytes32 emitterAddress, uint64 sequence, uint16 payloadOffset)
func (_WormholeVerifier *WormholeVerifierCallerSession) Verify(data []byte) (struct {
	EmitterChainId uint16
	EmitterAddress [32]byte
	Sequence       uint64
	PayloadOffset  uint16
}, error) {
	return _WormholeVerifier.Contract.Verify(&_WormholeVerifier.CallOpts, data)
}

// VerifyBatch is a free data retrieval call binding the contract method 0xacc6a7d9.
//
// Solidity: function verifyBatch() view returns()
func (_WormholeVerifier *WormholeVerifierCaller) VerifyBatch(opts *bind.CallOpts) error {
	var out []interface{}
	err := _WormholeVerifier.contract.Call(opts, &out, "verifyBatch")

	if err != nil {
		return err
	}

	return err

}

// VerifyBatch is a free data retrieval call binding the contract method 0xacc6a7d9.
//
// Solidity: function verifyBatch() view returns()
func (_WormholeVerifier *WormholeVerifierSession) VerifyBatch() error {
	return _WormholeVerifier.Contract.VerifyBatch(&_WormholeVerifier.CallOpts)
}

// VerifyBatch is a free data retrieval call binding the contract method 0xacc6a7d9.
//
// Solidity: function verifyBatch() view returns()
func (_WormholeVerifier *WormholeVerifierCallerSession) VerifyBatch() error {
	return _WormholeVerifier.Contract.VerifyBatch(&_WormholeVerifier.CallOpts)
}

// Update is a paid mutator transaction binding the contract method 0xc43ed2c8.
//
// Solidity: function update(bytes data) returns()
func (_WormholeVerifier *WormholeVerifierTransactor) Update(opts *bind.TransactOpts, data []byte) (*types.Transaction, error) {
	return _WormholeVerifier.contract.Transact(opts, "update", data)
}

// Update is a paid mutator transaction binding the contract method 0xc43ed2c8.
//
// Solidity: function update(bytes data) returns()
func (_WormholeVerifier *WormholeVerifierSession) Update(data []byte) (*types.Transaction, error) {
	return _WormholeVerifier.Contract.Update(&_WormholeVerifier.TransactOpts, data)
}

// Update is a paid mutator transaction binding the contract method 0xc43ed2c8.
//
// Solidity: function update(bytes data) returns()
func (_WormholeVerifier *WormholeVerifierTransactorSession) Update(data []byte) (*types.Transaction, error) {
	return _WormholeVerifier.Contract.Update(&_WormholeVerifier.TransactOpts, data)
}

// WormholeVerifierMultisigKeyDataPulledIterator is returned from FilterMultisigKeyDataPulled and is used to iterate over the raw logs and unpacked data for MultisigKeyDataPulled events raised by the WormholeVerifier contract.
type WormholeVerifierMultisigKeyDataPulledIterator struct {
	Event *WormholeVerifierMultisigKeyDataPulled // Event containing the contract specifics and raw log

	contract *bind.BoundContract // Generic contract to use for unpacking event data
	event    string              // Event name to use for unpacking event data

	logs chan types.Log        // Log channel receiving the found contract events
	sub  ethereum.Subscription // Subscription for errors, completion and termination
	done bool                  // Whether the subscription completed delivering logs
	fail error                 // Occurred error to stop iteration
}

// Next advances the iterator to the subsequent event, returning whether there
// are any more events found. In case of a retrieval or parsing error, false is
// returned and Error() can be queried for the exact failure.
func (it *WormholeVerifierMultisigKeyDataPulledIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(WormholeVerifierMultisigKeyDataPulled)
			if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
				it.fail = err
				return false
			}
			it.Event.Raw = log
			return true

		default:
			return false
		}
	}
	// Iterator still in progress, wait for either a data or an error event
	select {
	case log := <-it.logs:
		it.Event = new(WormholeVerifierMultisigKeyDataPulled)
		if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
			it.fail = err
			return false
		}
		it.Event.Raw = log
		return true

	case err := <-it.sub.Err():
		it.done = true
		it.fail = err
		return it.Next()
	}
}

// Error returns any retrieval or parsing error occurred during filtering.
func (it *WormholeVerifierMultisigKeyDataPulledIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *WormholeVerifierMultisigKeyDataPulledIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// WormholeVerifierMultisigKeyDataPulled represents a MultisigKeyDataPulled event raised by the WormholeVerifier contract.
type WormholeVerifierMultisigKeyDataPulled struct {
	NewMultisigKeyIndex *big.Int
	OldMultisigKeyIndex *big.Int
	Raw                 types.Log // Blockchain specific contextual infos
}

// FilterMultisigKeyDataPulled is a free log retrieval operation binding the contract event 0x2cf5811564caf1b17b9ec6ef23167528e768e89a2fc62c1484df5a6df35245fd.
//
// Solidity: event MultisigKeyDataPulled(uint256 indexed newMultisigKeyIndex, uint256 indexed oldMultisigKeyIndex)
func (_WormholeVerifier *WormholeVerifierFilterer) FilterMultisigKeyDataPulled(opts *bind.FilterOpts, newMultisigKeyIndex []*big.Int, oldMultisigKeyIndex []*big.Int) (*WormholeVerifierMultisigKeyDataPulledIterator, error) {

	var newMultisigKeyIndexRule []interface{}
	for _, newMultisigKeyIndexItem := range newMultisigKeyIndex {
		newMultisigKeyIndexRule = append(newMultisigKeyIndexRule, newMultisigKeyIndexItem)
	}
	var oldMultisigKeyIndexRule []interface{}
	for _, oldMultisigKeyIndexItem := range oldMultisigKeyIndex {
		oldMultisigKeyIndexRule = append(oldMultisigKeyIndexRule, oldMultisigKeyIndexItem)
	}

	logs, sub, err := _WormholeVerifier.contract.FilterLogs(opts, "MultisigKeyDataPulled", newMultisigKeyIndexRule, oldMultisigKeyIndexRule)
	if err != nil {
		return nil, err
	}
	return &WormholeVerifierMultisigKeyDataPulledIterator{contract: _WormholeVerifier.contract, event: "MultisigKeyDataPulled", logs: logs, sub: sub}, nil
}

// WatchMultisigKeyDataPulled is a free log subscription operation binding the contract event 0x2cf5811564caf1b17b9ec6ef23167528e768e89a2fc62c1484df5a6df35245fd.
//
// Solidity: event MultisigKeyDataPulled(uint256 indexed newMultisigKeyIndex, uint256 indexed oldMultisigKeyIndex)
func (_WormholeVerifier *WormholeVerifierFilterer) WatchMultisigKeyDataPulled(opts *bind.WatchOpts, sink chan<- *WormholeVerifierMultisigKeyDataPulled, newMultisigKeyIndex []*big.Int, oldMultisigKeyIndex []*big.Int) (event.Subscription, error) {

	var newMultisigKeyIndexRule []interface{}
	for _, newMultisigKeyIndexItem := range newMultisigKeyIndex {
		newMultisigKeyIndexRule = append(newMultisigKeyIndexRule, newMultisigKeyIndexItem)
	}
	var oldMultisigKeyIndexRule []interface{}
	for _, oldMultisigKeyIndexItem := range oldMultisigKeyIndex {
		oldMultisigKeyIndexRule = append(oldMultisigKeyIndexRule, oldMultisigKeyIndexItem)
	}

	logs, sub, err := _WormholeVerifier.contract.WatchLogs(opts, "MultisigKeyDataPulled", newMultisigKeyIndexRule, oldMultisigKeyIndexRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(WormholeVerifierMultisigKeyDataPulled)
				if err := _WormholeVerifier.contract.UnpackLog(event, "MultisigKeyDataPulled", log); err != nil {
					return err
				}
				event.Raw = log

				select {
				case sink <- event:
				case err := <-sub.Err():
					return err
				case <-quit:
					return nil
				}
			case err := <-sub.Err():
				return err
			case <-quit:
				return nil
			}
		}
	}), nil
}

// ParseMultisigKeyDataPulled is a log parse operation binding the contract event 0x2cf5811564caf1b17b9ec6ef23167528e768e89a2fc62c1484df5a6df35245fd.
//
// Solidity: event MultisigKeyDataPulled(uint256 indexed newMultisigKeyIndex, uint256 indexed oldMultisigKeyIndex)
func (_WormholeVerifier *WormholeVerifierFilterer) ParseMultisigKeyDataPulled(log types.Log) (*WormholeVerifierMultisigKeyDataPulled, error) {
	event := new(WormholeVerifierMultisigKeyDataPulled)
	if err := _WormholeVerifier.contract.UnpackLog(event, "MultisigKeyDataPulled", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// WormholeVerifierSchnorrKeyAddedIterator is returned from FilterSchnorrKeyAdded and is used to iterate over the raw logs and unpacked data for SchnorrKeyAdded events raised by the WormholeVerifier contract.
type WormholeVerifierSchnorrKeyAddedIterator struct {
	Event *WormholeVerifierSchnorrKeyAdded // Event containing the contract specifics and raw log

	contract *bind.BoundContract // Generic contract to use for unpacking event data
	event    string              // Event name to use for unpacking event data

	logs chan types.Log        // Log channel receiving the found contract events
	sub  ethereum.Subscription // Subscription for errors, completion and termination
	done bool                  // Whether the subscription completed delivering logs
	fail error                 // Occurred error to stop iteration
}

// Next advances the iterator to the subsequent event, returning whether there
// are any more events found. In case of a retrieval or parsing error, false is
// returned and Error() can be queried for the exact failure.
func (it *WormholeVerifierSchnorrKeyAddedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(WormholeVerifierSchnorrKeyAdded)
			if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
				it.fail = err
				return false
			}
			it.Event.Raw = log
			return true

		default:
			return false
		}
	}
	// Iterator still in progress, wait for either a data or an error event
	select {
	case log := <-it.logs:
		it.Event = new(WormholeVerifierSchnorrKeyAdded)
		if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
			it.fail = err
			return false
		}
		it.Event.Raw = log
		return true

	case err := <-it.sub.Err():
		it.done = true
		it.fail = err
		return it.Next()
	}
}

// Error returns any retrieval or parsing error occurred during filtering.
func (it *WormholeVerifierSchnorrKeyAddedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *WormholeVerifierSchnorrKeyAddedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// WormholeVerifierSchnorrKeyAdded represents a SchnorrKeyAdded event raised by the WormholeVerifier contract.
type WormholeVerifierSchnorrKeyAdded struct {
	NewSchnorrKeyIndex   uint32
	NewSchnorrKey        *big.Int
	InitialShardDataHash [32]byte
	Raw                  types.Log // Blockchain specific contextual infos
}

// FilterSchnorrKeyAdded is a free log retrieval operation binding the contract event 0x4ec0c5e71f41d083dbe7f8e281c0cef98f963fe91e34398b18663f2507738f62.
//
// Solidity: event SchnorrKeyAdded(uint32 indexed newSchnorrKeyIndex, uint256 newSchnorrKey, bytes32 initialShardDataHash)
func (_WormholeVerifier *WormholeVerifierFilterer) FilterSchnorrKeyAdded(opts *bind.FilterOpts, newSchnorrKeyIndex []uint32) (*WormholeVerifierSchnorrKeyAddedIterator, error) {

	var newSchnorrKeyIndexRule []interface{}
	for _, newSchnorrKeyIndexItem := range newSchnorrKeyIndex {
		newSchnorrKeyIndexRule = append(newSchnorrKeyIndexRule, newSchnorrKeyIndexItem)
	}

	logs, sub, err := _WormholeVerifier.contract.FilterLogs(opts, "SchnorrKeyAdded", newSchnorrKeyIndexRule)
	if err != nil {
		return nil, err
	}
	return &WormholeVerifierSchnorrKeyAddedIterator{contract: _WormholeVerifier.contract, event: "SchnorrKeyAdded", logs: logs, sub: sub}, nil
}

// WatchSchnorrKeyAdded is a free log subscription operation binding the contract event 0x4ec0c5e71f41d083dbe7f8e281c0cef98f963fe91e34398b18663f2507738f62.
//
// Solidity: event SchnorrKeyAdded(uint32 indexed newSchnorrKeyIndex, uint256 newSchnorrKey, bytes32 initialShardDataHash)
func (_WormholeVerifier *WormholeVerifierFilterer) WatchSchnorrKeyAdded(opts *bind.WatchOpts, sink chan<- *WormholeVerifierSchnorrKeyAdded, newSchnorrKeyIndex []uint32) (event.Subscription, error) {

	var newSchnorrKeyIndexRule []interface{}
	for _, newSchnorrKeyIndexItem := range newSchnorrKeyIndex {
		newSchnorrKeyIndexRule = append(newSchnorrKeyIndexRule, newSchnorrKeyIndexItem)
	}

	logs, sub, err := _WormholeVerifier.contract.WatchLogs(opts, "SchnorrKeyAdded", newSchnorrKeyIndexRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(WormholeVerifierSchnorrKeyAdded)
				if err := _WormholeVerifier.contract.UnpackLog(event, "SchnorrKeyAdded", log); err != nil {
					return err
				}
				event.Raw = log

				select {
				case sink <- event:
				case err := <-sub.Err():
					return err
				case <-quit:
					return nil
				}
			case err := <-sub.Err():
				return err
			case <-quit:
				return nil
			}
		}
	}), nil
}

// ParseSchnorrKeyAdded is a log parse operation binding the contract event 0x4ec0c5e71f41d083dbe7f8e281c0cef98f963fe91e34398b18663f2507738f62.
//
// Solidity: event SchnorrKeyAdded(uint32 indexed newSchnorrKeyIndex, uint256 newSchnorrKey, bytes32 initialShardDataHash)
func (_WormholeVerifier *WormholeVerifierFilterer) ParseSchnorrKeyAdded(log types.Log) (*WormholeVerifierSchnorrKeyAdded, error) {
	event := new(WormholeVerifierSchnorrKeyAdded)
	if err := _WormholeVerifier.contract.UnpackLog(event, "SchnorrKeyAdded", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// WormholeVerifierShardIdUpdatedIterator is returned from FilterShardIdUpdated and is used to iterate over the raw logs and unpacked data for ShardIdUpdated events raised by the WormholeVerifier contract.
type WormholeVerifierShardIdUpdatedIterator struct {
	Event *WormholeVerifierShardIdUpdated // Event containing the contract specifics and raw log

	contract *bind.BoundContract // Generic contract to use for unpacking event data
	event    string              // Event name to use for unpacking event data

	logs chan types.Log        // Log channel receiving the found contract events
	sub  ethereum.Subscription // Subscription for errors, completion and termination
	done bool                  // Whether the subscription completed delivering logs
	fail error                 // Occurred error to stop iteration
}

// Next advances the iterator to the subsequent event, returning whether there
// are any more events found. In case of a retrieval or parsing error, false is
// returned and Error() can be queried for the exact failure.
func (it *WormholeVerifierShardIdUpdatedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(WormholeVerifierShardIdUpdated)
			if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
				it.fail = err
				return false
			}
			it.Event.Raw = log
			return true

		default:
			return false
		}
	}
	// Iterator still in progress, wait for either a data or an error event
	select {
	case log := <-it.logs:
		it.Event = new(WormholeVerifierShardIdUpdated)
		if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
			it.fail = err
			return false
		}
		it.Event.Raw = log
		return true

	case err := <-it.sub.Err():
		it.done = true
		it.fail = err
		return it.Next()
	}
}

// Error returns any retrieval or parsing error occurred during filtering.
func (it *WormholeVerifierShardIdUpdatedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *WormholeVerifierShardIdUpdatedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// WormholeVerifierShardIdUpdated represents a ShardIdUpdated event raised by the WormholeVerifier contract.
type WormholeVerifierShardIdUpdated struct {
	SchnorrKeyIndex uint32
	SignerIndex     uint8
	OldPubKeyX      [32]byte
	OldPubKeyY      [32]byte
	NewPubKeyX      [32]byte
	NewPubKeyY      [32]byte
	Raw             types.Log // Blockchain specific contextual infos
}

// FilterShardIdUpdated is a free log retrieval operation binding the contract event 0x613a4a4b238ed463025c2c3354461a40d785b788921a3a173ef596f9f7c483eb.
//
// Solidity: event ShardIdUpdated(uint32 indexed schnorrKeyIndex, uint8 indexed signerIndex, bytes32 oldPubKeyX, bytes32 oldPubKeyY, bytes32 newPubKeyX, bytes32 newPubKeyY)
func (_WormholeVerifier *WormholeVerifierFilterer) FilterShardIdUpdated(opts *bind.FilterOpts, schnorrKeyIndex []uint32, signerIndex []uint8) (*WormholeVerifierShardIdUpdatedIterator, error) {

	var schnorrKeyIndexRule []interface{}
	for _, schnorrKeyIndexItem := range schnorrKeyIndex {
		schnorrKeyIndexRule = append(schnorrKeyIndexRule, schnorrKeyIndexItem)
	}
	var signerIndexRule []interface{}
	for _, signerIndexItem := range signerIndex {
		signerIndexRule = append(signerIndexRule, signerIndexItem)
	}

	logs, sub, err := _WormholeVerifier.contract.FilterLogs(opts, "ShardIdUpdated", schnorrKeyIndexRule, signerIndexRule)
	if err != nil {
		return nil, err
	}
	return &WormholeVerifierShardIdUpdatedIterator{contract: _WormholeVerifier.contract, event: "ShardIdUpdated", logs: logs, sub: sub}, nil
}

// WatchShardIdUpdated is a free log subscription operation binding the contract event 0x613a4a4b238ed463025c2c3354461a40d785b788921a3a173ef596f9f7c483eb.
//
// Solidity: event ShardIdUpdated(uint32 indexed schnorrKeyIndex, uint8 indexed signerIndex, bytes32 oldPubKeyX, bytes32 oldPubKeyY, bytes32 newPubKeyX, bytes32 newPubKeyY)
func (_WormholeVerifier *WormholeVerifierFilterer) WatchShardIdUpdated(opts *bind.WatchOpts, sink chan<- *WormholeVerifierShardIdUpdated, schnorrKeyIndex []uint32, signerIndex []uint8) (event.Subscription, error) {

	var schnorrKeyIndexRule []interface{}
	for _, schnorrKeyIndexItem := range schnorrKeyIndex {
		schnorrKeyIndexRule = append(schnorrKeyIndexRule, schnorrKeyIndexItem)
	}
	var signerIndexRule []interface{}
	for _, signerIndexItem := range signerIndex {
		signerIndexRule = append(signerIndexRule, signerIndexItem)
	}

	logs, sub, err := _WormholeVerifier.contract.WatchLogs(opts, "ShardIdUpdated", schnorrKeyIndexRule, signerIndexRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(WormholeVerifierShardIdUpdated)
				if err := _WormholeVerifier.contract.UnpackLog(event, "ShardIdUpdated", log); err != nil {
					return err
				}
				event.Raw = log

				select {
				case sink <- event:
				case err := <-sub.Err():
					return err
				case <-quit:
					return nil
				}
			case err := <-sub.Err():
				return err
			case <-quit:
				return nil
			}
		}
	}), nil
}

// ParseShardIdUpdated is a log parse operation binding the contract event 0x613a4a4b238ed463025c2c3354461a40d785b788921a3a173ef596f9f7c483eb.
//
// Solidity: event ShardIdUpdated(uint32 indexed schnorrKeyIndex, uint8 indexed signerIndex, bytes32 oldPubKeyX, bytes32 oldPubKeyY, bytes32 newPubKeyX, bytes32 newPubKeyY)
func (_WormholeVerifier *WormholeVerifierFilterer) ParseShardIdUpdated(log types.Log) (*WormholeVerifierShardIdUpdated, error) {
	event := new(WormholeVerifierShardIdUpdated)
	if err := _WormholeVerifier.contract.UnpackLog(event, "ShardIdUpdated", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}
