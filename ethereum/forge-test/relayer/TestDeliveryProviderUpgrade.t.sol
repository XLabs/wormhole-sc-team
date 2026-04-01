// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import "forge-std/Test.sol";

import {DeliveryProviderImplementation} from "../../contracts/relayer/deliveryProvider/DeliveryProviderImplementation.sol";
import {EvmExecutionParamsV1, encodeEvmExecutionParamsV1} from "../../contracts/relayer/libraries/ExecutionParameters.sol";
import {toWormholeFormat} from "../../contracts/relayer/libraries/Utils.sol";
import {Gas} from "../../contracts/interfaces/relayer/TypedUnits.sol";

type TargetNative is uint256;
type LocalNative is uint256;

struct VaaKey {
    uint16 chainId;
    bytes32 emitterAddress;
    uint64 sequence;
}

interface IRelayerLike {
    function quoteDeliveryPrice(
        uint16 targetChain,
        TargetNative receiverValue,
        bytes calldata encodedExecutionParameters,
        address deliveryProviderAddress
    ) external view returns (LocalNative);

    function send(
        uint16 targetChain,
        bytes32 targetAddress,
        bytes calldata payload,
        TargetNative receiverValue,
        LocalNative paymentForExtraReceiverValue,
        bytes calldata encodedExecutionParameters,
        uint16 refundChain,
        bytes32 refundAddress,
        address deliveryProviderAddress,
        VaaKey[] calldata vaaKeys,
        uint8 consistencyLevel
    ) external payable returns (uint64 sequence);
}

interface IProxyAdminLike {
    function upgrade(uint16 deliveryProviderChainId, address newImplementation) external;
}

uint16 constant ethereumChainId = 2;
uint16 constant bscChainId = 4;

contract RelayerZeroQuoteUpgradeForkTest is Test {
    // --- env vars / config ---
    // Set these in your .env:
    // TEST_RPC_URL=...
    // RELAYER_PROXY=0x...
    // DELIVERY_PROVIDER_ADMIN=0x...
    // DELIVERY_PROVIDER=0x...
    //
    // Example:
    // forge test --match-test testFork_Upgrade_ZeroQuote -vvvv

    IRelayerLike internal relayer;

    address internal relayerProxy;
    address internal deliveryProviderAdmin;
    address internal deliveryProvider;
    address internal upgrader;

    uint256 internal forkId;

    function setUp() public {
        string memory rpcUrl = vm.envString("TEST_RPC_URL");
        forkId = vm.createFork(rpcUrl);
        vm.selectFork(forkId);

        relayerProxy = vm.envAddress("RELAYER_PROXY");
        deliveryProvider = vm.envAddress("DELIVERY_PROVIDER");
        deliveryProviderAdmin = vm.envAddress("DELIVERY_PROVIDER_ADMIN");

        relayer = IRelayerLike(relayerProxy);

    }

    function testFork_Upgrade_ZeroQuote(uint256 gasLimit) public {
        _upgrade();

        uint16 targetChain = bscChainId;
        TargetNative receiverValue = TargetNative.wrap(1 ether);
        bytes memory encodedExecutionParameters = _sampleExecutionParams(gasLimit);

        LocalNative quote = relayer.quoteDeliveryPrice(
            targetChain,
            receiverValue,
            encodedExecutionParameters,
            deliveryProvider
        );

        assertEq(
            LocalNative.unwrap(quote),
            0,
            "quoteDeliveryPrice should return zero after upgrade"
        );
    }

    function testFork_Send_Succeeds_WhenQuoteIsZero_AndExtraValueIsOnlyMsgValue(uint256 gasLimit) public {
        _upgrade();

        uint16 targetChain = bscChainId;
        bytes32 targetAddress = toWormholeFormat(address(0xBEEF));
        bytes memory payload = hex"1234";

        TargetNative receiverValue = TargetNative.wrap(1 ether);
        LocalNative paymentForExtraReceiverValue = LocalNative.wrap(0.05 ether);
        bytes memory encodedExecutionParameters = _sampleExecutionParams(gasLimit);

        uint16 refundChain = ethereumChainId;
        bytes32 refundAddress = toWormholeFormat(address(this));
        uint8 consistencyLevel = 0;

        LocalNative quote = relayer.quoteDeliveryPrice(
            targetChain,
            receiverValue,
            encodedExecutionParameters,
            deliveryProvider
        );
        assertEq(LocalNative.unwrap(quote), 0, "quote must be zero");

        uint256 msgValue = LocalNative.unwrap(paymentForExtraReceiverValue);

        // fund the test contract
        vm.deal(address(this), 100 ether);

        uint64 sequence = relayer.send{value: msgValue}(
            targetChain,
            targetAddress,
            payload,
            receiverValue,
            paymentForExtraReceiverValue,
            encodedExecutionParameters,
            refundChain,
            refundAddress,
            deliveryProvider,
            new VaaKey[](0),
            consistencyLevel
        );

        assertTrue(sequence >= 0, "send should succeed");
    }

    function testFork_Send_Succeeds_WithZeroMsgValue_WhenExtraReceiverValueIsZero(uint256 gasLimit) public {
        _upgrade();

        uint16 targetChain = bscChainId;
        bytes32 targetAddress = toWormholeFormat(address(0xBEEF));
        bytes memory payload = hex"";
        TargetNative receiverValue = TargetNative.wrap(0);
        LocalNative paymentForExtraReceiverValue = LocalNative.wrap(0);
        bytes memory encodedExecutionParameters = _sampleExecutionParams(gasLimit);

        uint16 refundChain = ethereumChainId;
        bytes32 refundAddress = toWormholeFormat(address(this));
        uint8 consistencyLevel = 0;

        LocalNative quote = relayer.quoteDeliveryPrice(
            targetChain,
            receiverValue,
            encodedExecutionParameters,
            deliveryProvider
        );
        assertEq(LocalNative.unwrap(quote), 0, "quote must be zero");

        uint64 sequence = relayer.send{value: 0}(
            targetChain,
            targetAddress,
            payload,
            receiverValue,
            paymentForExtraReceiverValue,
            encodedExecutionParameters,
            refundChain,
            refundAddress,
            deliveryProvider,
            new VaaKey[](0),
            consistencyLevel
        );

        assertTrue(sequence >= 0, "send should succeed with zero msg.value");
    }

    function testFork_QuoteIsZero_ForRepresentativeInputs(uint256 gasLimit) public {
        _upgrade();

        bytes32 targetAddress = toWormholeFormat(address(0xBEEF));
        bytes memory payload = hex"";
        TargetNative receiverValue = TargetNative.wrap(0);
        LocalNative paymentForExtraReceiverValue = LocalNative.wrap(0);
        uint16 refundChain = ethereumChainId;
        bytes32 refundAddress = toWormholeFormat(address(this));
        uint8 consistencyLevel = 0;

        uint16[3] memory chains = [uint16(2), uint16(4), uint16(23)];
        uint256[4] memory receiverValues = [uint256(0), 1, 1 gwei, 1 ether];
        bytes memory execParams = _sampleExecutionParams(gasLimit);

        for (uint256 i = 0; i < chains.length; i++) {
            for (uint256 j = 0; j < receiverValues.length; j++) {
                LocalNative quote = relayer.quoteDeliveryPrice(
                    chains[i],
                    TargetNative.wrap(receiverValues[j]),
                    execParams,
                    deliveryProvider
                );

                assertEq(
                    LocalNative.unwrap(quote),
                    0,
                    "quoteDeliveryPrice should always be zero after upgrade"
                );

                uint64 sequence = relayer.send{value: 0}(
                    chains[i],
                    targetAddress,
                    payload,
                    receiverValue,
                    paymentForExtraReceiverValue,
                    execParams,
                    refundChain,
                    refundAddress,
                    deliveryProvider,
                    new VaaKey[](0),
                    consistencyLevel
                );

                assertTrue(sequence >= 0, "send should succeed with zero msg.value");

            }
        }
    }

    // --- helpers ---

    function _upgrade() internal {
        DeliveryProviderImplementation newImplementation = new DeliveryProviderImplementation();

        vm.startPrank(deliveryProviderAdmin);
        IProxyAdminLike(deliveryProvider).upgrade(ethereumChainId, address(newImplementation));
        vm.stopPrank();
    }

    function _sampleExecutionParams(uint256 gasLimit) internal view returns (bytes memory) {
        gasLimit = bound(gasLimit, 0, 1_000_000);
        EvmExecutionParamsV1 memory params = EvmExecutionParamsV1({gasLimit: Gas.wrap(gasLimit)});

        return encodeEvmExecutionParamsV1(params);
    }
}