import fs from "fs";
import { createWalletClient, defineChain, http, isHex, encodePacked, Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { waitForTransactionReceipt } from "viem/actions";
import { Connection, Keypair, PublicKey, sendAndConfirmTransaction, Transaction } from "@solana/web3.js";
import { Program, AnchorProvider, Wallet } from "@coral-xyz/anchor";
import yargs, { type Argv } from "yargs";
import { hideBin } from 'yargs/helpers';
import { parseGuardianKey, errorMsg, errorStack } from '@xlabs-xyz/peer-lib';

import type { VerificationV2 } from "../../../src/solana/target/types/verification_v2.js";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const idl = require("../../../src/solana/target/idl/verification_v2.json");

// Default contract address for WormholeVerifier
const DEFAULT_EVM_CONTRACT_ADDRESS = "0x0000000000000000000000000000000000000000"; // TODO: Update with actual deployed address
const DEFAULT_SOLANA_PROGRAM_ID = "GbFfTqMqKDgAMRH8VmDmoLTdvDd1853TnkkEwpydv3J6";

const UPDATE_SET_SHARD_ID = 0;
const UPDATE_APPEND_SCHNORR_KEY = 1;
const UPDATE_PULL_MULTISIG_KEY_DATA = 2;

const UPDATE_ABI = [
  {
    name: 'update',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'data', type: 'bytes' }],
    outputs: [],
  },
] as const;

type BaseArgs = {
  chain: "evm" | "solana";
  contractAddress: string;
  rpcUrl: string;
  signer: string;
}

type EvmArgs = BaseArgs & {
  chain: "evm";
  chainId: number;
  limit: number;
} & ({
  command: "set_shard_id";
  guardianMessage: string;
} | {
  command: "append_schnorr";
  vaa: string;
} | {
  command: "pull_multisigs";
})

type SolanaArgs = BaseArgs & {
  chain: "solana";
  command: "append_schnorr";
  postedVaa: string;
  signatureSet: string;
  newKeyIndex: number;
  oldKeyIndex?: number;
}

type Args = EvmArgs | SolanaArgs;

// TODO: Use binary-layout for these
function encodeSetShardId(guardianMessage: Buffer): Hex {
  // set_shard_id: opcode (1 byte) + guardian message data
  return encodePacked(
    ['uint8', 'bytes'],
    [UPDATE_SET_SHARD_ID, `0x${guardianMessage.toString('hex')}`]
  );
}

function encodeAppendSchnorrKey(vaa: Buffer): Hex {
  // append_schnorr_KEY: opcode (1 byte) + vaa length (2 bytes) + vaa data
  return encodePacked(
    ['uint8', 'uint16', 'bytes'],
    [UPDATE_APPEND_SCHNORR_KEY, vaa.length, `0x${vaa.toString('hex')}`]
  );
}

function encodePullMultisigKeyData(limit: number): `0x${string}` {
  // PULL_MULTISIG_KEY_DATA: opcode (1 byte) + limit (4 bytes)
  return encodePacked(
    ['uint8', 'uint32'],
    [UPDATE_PULL_MULTISIG_KEY_DATA, limit]
  );
}

function encodeUpdate(args: EvmArgs, dataBytes: Buffer): `0x${string}` {
  if (args.command === "append_schnorr") {
    const pullData = encodePullMultisigKeyData(args.limit);
    const appendData = encodeAppendSchnorrKey(dataBytes);
    console.log(`Prepared pull_multisigs with limit ${args.limit}`);
    console.log(`Prepared append_schnorr with ${dataBytes.length} bytes of data`);
    return encodePacked(['bytes', 'bytes'], [pullData, appendData]);
  } else if (args.command === "set_shard_id") {
    console.log(`Prepared set_shard_id with ${dataBytes.length} bytes of data`);
    return encodeSetShardId(dataBytes);
  } else {
    console.log(`Prepared pull_multisigs with limit ${args.limit}`);
    return encodePullMultisigKeyData(args.limit);
  }
}

// Derive the schnorr key PDA from key index
function deriveSchnorrKeyPda(programId: PublicKey, schnorrKeyIndex: number): PublicKey {
  const schnorrKeyIndexBuf = Buffer.alloc(4);
  schnorrKeyIndexBuf.writeUint32LE(schnorrKeyIndex);
  const seeds = [Buffer.from("schnorrkey"), schnorrKeyIndexBuf];
  const [pda] = PublicKey.findProgramAddressSync(seeds, programId);
  return pda;
}

// Derive the latest key PDA
function deriveLatestKeyPda(programId: PublicKey): PublicKey {
  const seeds = [Buffer.from("latestkey")];
  const [pda] = PublicKey.findProgramAddressSync(seeds, programId);
  return pda;
}

async function executeEvmTransaction(args: EvmArgs, dataBytes: Buffer): Promise<void> {
  let signerKey: Hex;
  try {
    const signerFile = fs.readFileSync(args.signer, 'utf-8');
    const keyBytes = parseGuardianKey(signerFile);
    signerKey = `0x${Buffer.from(keyBytes).toString('hex')}`;
  } catch (error) {
    console.error(`Failed to parse signer file: ${errorMsg(error)}`);
    process.exit(1);
  }

  const account = privateKeyToAccount(signerKey);
  console.log(`Using signer address: ${account.address}`);

  // Validate contract address
  if (!isHex(args.contractAddress)) {
    console.error("Contract address must be a valid hex address");
    process.exit(1);
  }

  // Setup chain and wallet client
  const viemChain = defineChain({
    id: args.chainId,
    name: `Chain ${args.chainId}`,
    nativeCurrency: {
      decimals: 18,
      name: 'ETH',
      symbol: 'ETH',
    },
    rpcUrls: {
      default: {
        http: [args.rpcUrl],
      },
    },
  });

  const walletClient = createWalletClient({
    chain: viemChain,
    transport: http(args.rpcUrl),
    account,
  });

  const updateData = encodeUpdate(args, dataBytes);

  console.log(`Target contract: ${args.contractAddress}`);
  console.log(`Chain ID: ${args.chainId}`);
  console.log(`RPC URL: ${args.rpcUrl}`);

  try {
    console.log('\nSending transaction...');
    const txHash = await walletClient.writeContract({
      address: args.contractAddress,
      abi: UPDATE_ABI,
      functionName: 'update',
      args: [updateData],
    });

    console.log(`Transaction sent: ${txHash}`);
    console.log('Waiting for confirmation...');

    const receipt = await waitForTransactionReceipt(walletClient, {
      hash: txHash,
    });

    if (receipt.status === 'success') {
      console.log(`Transaction confirmed in block ${receipt.blockNumber}`);
      console.log(`Gas used: ${receipt.gasUsed}`);
    } else {
      console.error('Transaction failed');
      process.exit(1);
    }
  } catch (error) {
    console.error(`Transaction failed: ${errorStack(error)}`);
    process.exit(1);
  }
}

async function executeSolanaTransaction(args: SolanaArgs): Promise<void> {
  // Load keypair from JSON file
  let keypair: Keypair;
  try {
    const keypairData = JSON.parse(fs.readFileSync(args.signer, 'utf-8'));
    keypair = Keypair.fromSecretKey(new Uint8Array(keypairData));
  } catch (error) {
    console.error(`Failed to load Solana keypair from ${args.signer}: ${errorMsg(error)}`);
    process.exit(1);
  }

  console.log(`Using signer: ${keypair.publicKey.toBase58()}`);

  const connection = new Connection(args.rpcUrl, "confirmed");
  const programId = new PublicKey(args.contractAddress || DEFAULT_SOLANA_PROGRAM_ID);

  const wallet = new Wallet(keypair);
  const provider = new AnchorProvider(connection, wallet, { commitment: "confirmed" });
  const program = new Program<VerificationV2>(idl as VerificationV2, provider);

  const postedVaa = new PublicKey(args.postedVaa);
  const signatureSet = new PublicKey(args.signatureSet);
  const latestKeyPda = deriveLatestKeyPda(programId);
  const newSchnorrKeyPda = deriveSchnorrKeyPda(programId, args.newKeyIndex);
  const oldSchnorrKeyPda = args.oldKeyIndex !== undefined 
    ? deriveSchnorrKeyPda(programId, args.oldKeyIndex)
    : null;

  console.log(`Target program: ${programId.toBase58()}`);
  console.log(`Posted VAA: ${postedVaa.toBase58()}`);
  console.log(`Signature Set: ${signatureSet.toBase58()}`);
  console.log(`Latest Key PDA: ${latestKeyPda.toBase58()}`);
  console.log(`New Schnorr Key PDA: ${newSchnorrKeyPda.toBase58()}`);
  if (oldSchnorrKeyPda) {
    console.log(`Old Schnorr Key PDA: ${oldSchnorrKeyPda.toBase58()}`);
  }
  console.log(`RPC URL: ${args.rpcUrl}`);

  try {
    console.log('\nBuilding transaction...');
    const ix = await program.methods.appendSchnorrKey()
      .accountsPartial({
        payer: keypair.publicKey,
        vaa: postedVaa,
        signatureSet: signatureSet,
        latestSchnorrKey: latestKeyPda,
        newSchnorrKey: newSchnorrKeyPda,
        oldSchnorrKey: oldSchnorrKeyPda,
      })
      .instruction();

    const tx = new Transaction().add(ix);
    
    console.log('Sending transaction...');
    const signature = await sendAndConfirmTransaction(connection, tx, [keypair], {
      commitment: "confirmed",
    });

    console.log(`Transaction confirmed: ${signature}`);
  } catch (error) {
    console.error(`Transaction failed: ${errorStack(error)}`);
    process.exit(1);
  }
}

async function main() {
  const parser = yargs(hideBin(process.argv))
    .command('set_shard_id <guardian-message>', 'Set the shard ID of the guardian (EVM only)',
      (yargs: Argv) => yargs.positional('guardian-message', {
        description: 'Path to file containing base64-encoded signed guardian message',
        type: 'string',
      }
    ))
    .command('append_schnorr <vaa>', 'Append a Schnorr key to the VerificationV2 contract',
      (yargs: Argv) => yargs
        .positional('vaa', {
          description: 'Base64 encoded governance VAA (EVM) or ignored (Solana)',
          type: 'string',
        })
        .option('posted-vaa', {
          description: '[Solana only] Address of the posted VAA account',
          type: 'string',
        })
        .option('signature-set', {
          description: '[Solana only] Address of the signature set account',
          type: 'string',
        })
        .option('new-key-index', {
          description: '[Solana only] Index of the new schnorr key to create',
          type: 'number',
        })
        .option('old-key-index', {
          description: '[Solana only] Index of the old schnorr key (omit for init)',
          type: 'number',
        })
    )
    .command('pull_multisigs', 'Pull multisig sets from the core contract (EVM only)')
    .demandCommand(1, 'A command is required')
    .strictCommands()
    .option('chain', {
      description: 'Target chain type',
      choices: ['evm', 'solana'] as const,
      default: 'evm' as const,
      alias: 't',
    })
    //TODO: add support for ledger signer
    .option('signer', {
      description: 'Path to signer key file (GPG armor guardian key for EVM, JSON keypair for Solana)',
      demandOption: true,
      type: 'string',
      alias: 's',
    })
    .option('contract-address', {
      description: 'Address of the WormholeVerifier contract/program',
      type: 'string',
      default: DEFAULT_EVM_CONTRACT_ADDRESS,
      alias: 'c',
    })
    .option('rpc-url', {
      description: 'RPC endpoint URL for the target chain',
      type: 'string',
      default: 'https://eth.llamarpc.com',
      alias: 'r',
    })
    .option('chain-id', {
      description: '[EVM only] EIP-155 Chain ID',
      type: 'number',
      default: 1,
      alias: 'i',
    })
    .option('limit', {
      description: '[EVM only] Maximum number of multisig sets to pull.',
      defaultDescription: '0 (Pull all necessary multisig sets)',
      type: 'number',
      alias: 'l',
      default: 0,
    })
    .strictOptions()
    .help()
    .alias('help', 'h');

  const parsedArgs = await parser.parse();
  const command = parsedArgs._[0] as string;

  if (parsedArgs.chain === "solana") {
    // Validate Solana-specific requirements
    if (command !== "append_schnorr") {
      console.error(`Command '${command}' is not supported on Solana. Only 'append_schnorr' is available.`);
      process.exit(1);
    }

    if (!parsedArgs.postedVaa || !parsedArgs.signatureSet || parsedArgs.newKeyIndex === undefined) {
      console.error("Solana append_schnorr requires --posted-vaa, --signature-set, and --new-key-index");
      process.exit(1);
    }

    const args: SolanaArgs = {
      chain: "solana",
      command: "append_schnorr",
      contractAddress: parsedArgs.contractAddress === DEFAULT_EVM_CONTRACT_ADDRESS 
        ? DEFAULT_SOLANA_PROGRAM_ID 
        : parsedArgs.contractAddress,
      rpcUrl: parsedArgs.rpcUrl === 'https://eth.llamarpc.com'
        ? 'https://api.mainnet-beta.solana.com'
        : parsedArgs.rpcUrl,
      signer: parsedArgs.signer,
      postedVaa: parsedArgs.postedVaa,
      signatureSet: parsedArgs.signatureSet,
      newKeyIndex: parsedArgs.newKeyIndex,
      oldKeyIndex: parsedArgs.oldKeyIndex,
    };

    await executeSolanaTransaction(args);
  } else {
    // EVM flow
    let dataBytes = Buffer.alloc(0);
    
    if (command === "set_shard_id") {
      const guardianMessage = parsedArgs.guardianMessage as string;
      try {
        const messageBase64 = fs.readFileSync(guardianMessage, 'utf-8').trim();
        dataBytes = Buffer.from(messageBase64, 'base64');
      } catch (error) {
        console.error(`Failed to load data from ${guardianMessage}: ${errorMsg(error)}`);
        process.exit(1);
      }
      console.log(`Loaded ${dataBytes.length} bytes of data from ${guardianMessage}`);
    } else if (command === "append_schnorr") {
      const vaa = parsedArgs.vaa as string;
      try {
        dataBytes = Buffer.from(vaa, 'base64');
      } catch (error) {
        console.error(`Failed to load VAA: ${errorMsg(error)}`);
        process.exit(1);
      }
      console.log(`Loaded ${dataBytes.length} bytes of VAA`);
    }

    const args: EvmArgs = {
      chain: "evm",
      command: command as EvmArgs["command"],
      contractAddress: parsedArgs.contractAddress,
      rpcUrl: parsedArgs.rpcUrl,
      chainId: parsedArgs.chainId,
      signer: parsedArgs.signer,
      limit: parsedArgs.limit,
      ...(command === "set_shard_id" ? { guardianMessage: parsedArgs.guardianMessage as string } : {}),
      ...(command === "append_schnorr" ? { vaa: parsedArgs.vaa as string } : {}),
    } as EvmArgs;

    await executeEvmTransaction(args, dataBytes);
  }
}

main().catch((error: unknown) => {
  console.error(`[ERROR] Unhandled error: ${errorStack(error)}`);
  process.exit(1);
});
