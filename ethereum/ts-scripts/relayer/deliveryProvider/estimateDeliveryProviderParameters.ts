import { init, readChains } from "../helpers/env";
import { ethers } from 'ethers';

function roundUpToNext100(value: bigint): bigint {
    const remainder = value % 100n;
    return remainder === 0n ? value : value + (100n - remainder);
  }

(async() => {

    const FEE_HISTORY_BLOCK_COUNT = '0x400';

    init();

    const chains = await readChains();
    for (const chain of chains.chains) {

        // Connect RPC provider
        const provider = new ethers.providers.JsonRpcProvider(chain.rpc);

        try {
            const eth_feeHistory = await provider.send("eth_feeHistory", [FEE_HISTORY_BLOCK_COUNT, "latest", [95]]);

            // Get the average baseFeePerGas
            const avgBaseFeePerGas = eth_feeHistory.baseFeePerGas.reduce((a: string, b: string) => BigInt(a) + BigInt(b), 0) / BigInt(eth_feeHistory.baseFeePerGas.length);

            // Get the average priorityFee

            const priorityFeeList = eth_feeHistory.reward.flat();
            const avgPriorityFees = priorityFeeList.reduce((a: string, b: string) => BigInt(a) + BigInt(b), 0) / BigInt(priorityFeeList.length);

            console.log(`Chain ${chain.chainId}: Avg BaseFeePerGas: ${avgBaseFeePerGas}` + 
                `\tAvg PriorityFees: ${avgPriorityFees} \tT=${roundUpToNext100(avgBaseFeePerGas + avgPriorityFees)}`);
        
            // console.log(chain.chainId, eth_feeHistory)
        } catch (e) {
            // handle ether providers error -32601

            if (e.code === "SERVER_ERROR" && JSON.parse(e.body).error.code === -32601) {
                console.warn(chain.chainId, 'eth_feeHistory not supported')
            } else {
                console.log(e)
            }
        }
    }
})()