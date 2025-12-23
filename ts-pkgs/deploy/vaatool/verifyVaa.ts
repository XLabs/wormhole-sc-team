import { createPublicClient, http, Address, Hex, PublicClient } from "viem";
import { Chain, isChainId, toChain } from "@wormhole-foundation/sdk";
import { Connection, PublicKey } from "@solana/web3.js";
import { Program, AnchorProvider } from "@coral-xyz/anchor";
import yargs from "yargs";
import { hideBin } from 'yargs/helpers';

import type { VerificationV2 } from "../../../src/solana/target/types/verification_v2.js";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const idl = require("../../../src/solana/target/idl/verification_v2.json");

const VERIFICATION_FAILED_ERROR_SIGNATURE = "0x32629d58";

// Default Solana program ID from IDL
const DEFAULT_SOLANA_PROGRAM_ID = "GbFfTqMqKDgAMRH8VmDmoLTdvDd1853TnkkEwpydv3J6";

const WORMHOLE_VERIFIER_ABI = [
  {
    inputs: [{ internalType: "bytes", name: "data", type: "bytes" }],
    name: "verify",
    outputs: [
      { internalType: "uint16", name: "emitterChainId", type: "uint16" },
      { internalType: "bytes32", name: "emitterAddress", type: "bytes32" },
      { internalType: "uint64", name: "sequence", type: "uint64" },
      { internalType: "uint16", name: "payloadOffset", type: "uint16" },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

export type VerificationResult = {
  verified: true;
  emitterChainId: number;
  emitterAddress: string;
  sequence: bigint;
  payloadOffset: number;
} | {
  verified: false;
  error: string;
}

// EVM verification
async function verifyVaaEvm(
  client: PublicClient,
  verifierAddress: Address,
  vaa: Hex,
): Promise<VerificationResult> {
  try {
    const result = await client.readContract({
      address: verifierAddress,
      abi: WORMHOLE_VERIFIER_ABI,
      functionName: "verify",
      args: [vaa],
    });
    return {
      verified: true,
      emitterChainId: result[0],
      emitterAddress: result[1],
      sequence: result[2],
      payloadOffset: result[3],
    };
  } catch (error) {
    if (!(error instanceof Error && error.cause && typeof error.cause === 'object' && "raw" in error.cause)) {
      return { verified: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
    const hexData = (error.cause as { raw: Hex }).raw;
    if (hexData.startsWith(VERIFICATION_FAILED_ERROR_SIGNATURE)) {
      const flags = hexData.slice(VERIFICATION_FAILED_ERROR_SIGNATURE.length);
      return { verified: false, error: `Verification failed with flags: 0x${flags}` };
    }
    return { verified: false, error: `Contract call failed with unknown error data: ${hexData}` };
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

// Extract schnorr key index from VAA header (first 4 bytes after version byte for Schnorr VAAs)
function getSchnorrKeyIndexFromVaa(vaaBytes: Buffer): number {
  // Version is first byte, schnorr key index is next 4 bytes (little endian)
  return vaaBytes.readUInt32LE(1);
}

// Solana verification via simulate
async function verifyVaaSolana(
  connection: Connection,
  programId: PublicKey,
  vaaBytes: Buffer,
): Promise<VerificationResult> {
  try {
    // Create a read-only provider (no wallet needed for simulation)
    const provider = new AnchorProvider(
      connection,
      {
        publicKey: PublicKey.default,
        signTransaction: async () => { throw new Error("Read-only"); },
        signAllTransactions: async () => { throw new Error("Read-only"); },
      },
      { commitment: "confirmed" }
    );

    const program = new Program<VerificationV2>(idl as VerificationV2, provider);

    const schnorrKeyIndex = getSchnorrKeyIndexFromVaa(vaaBytes);
    const schnorrKeyPda = deriveSchnorrKeyPda(programId, schnorrKeyIndex);

    // Use simulate to verify without submitting a transaction
    const ix = await program.methods
      .verifyVaa(vaaBytes)
      .accounts({
        keyAccount: schnorrKeyPda,
      })
      .instruction();

    const { blockhash } = await connection.getLatestBlockhash();
    const message = new (await import("@solana/web3.js")).TransactionMessage({
      payerKey: PublicKey.default,
      recentBlockhash: blockhash,
      instructions: [ix],
    }).compileToV0Message();

    const tx = new (await import("@solana/web3.js")).VersionedTransaction(message);

    const result = await connection.simulateTransaction(tx, {
      sigVerify: false,
    });

    if (result.value.err) {
      const logs = result.value.logs?.join("\n") || "No logs";
      return { verified: false, error: `Simulation failed: ${JSON.stringify(result.value.err)}\nLogs:\n${logs}` };
    }

    // For Solana, we don't get the parsed VAA data back from verify_vaa (only verify_vaa_and_decode returns it)
    // Return a simplified success result
    return {
      verified: true,
      emitterChainId: 0, // Not available from verify_vaa
      emitterAddress: "0x" + "0".repeat(64),
      sequence: 0n,
      payloadOffset: 0,
    };
  } catch (error) {
    return { verified: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

function toMaybeUnknownChain(chainId: number): Chain | "Unknown" {
  if (isChainId(chainId)) {
    return toChain(chainId);
  }
  return "Unknown";
}

function getVaaType(vaaBytes: Buffer): "Multisig" | "Schnorr" | undefined {
  if (vaaBytes[0] === 0x01) {
    return "Multisig";
  }
  if (vaaBytes[0] === 0x02) {
    return "Schnorr";
  }
  return undefined;
}

type Args = {
  chain: "evm" | "solana";
  rpcUrl: string;
  verifierAddress: string;
  vaa: string;
}

async function main() {
  const parser = yargs(hideBin(process.argv))
    .option('chain', {
      description: 'Target chain type',
      choices: ['evm', 'solana'] as const,
      default: 'evm' as const,
      alias: 't',
    })
    .option('rpc-url', {
      description: 'RPC endpoint URL',
      type: 'string',
      demandOption: true,
      alias: 'r',
    })
    .option('verifier-address', {
      description: 'Verifier contract/program address',
      type: 'string',
      demandOption: true,
      alias: 'a',
    })
    .option('vaa', {
      description: 'Base64 encoded VAA to verify',
      type: 'string',
      demandOption: true,
      alias: 'v',
    })
    .strictOptions()
    .help()
    .alias('help', 'h');

  const args = await parser.parse() as Args;
  const vaaBytes = Buffer.from(args.vaa, "base64");
  const vaaType = getVaaType(vaaBytes);

  if (vaaType === undefined) {
    console.error(`Invalid VAA type (first byte: 0x${vaaBytes[0].toString(16).padStart(2, '0')})`);
    process.exit(1);
  }

  console.log(`Verifying ${vaaType} VAA on ${args.chain.toUpperCase()}...`);

  let result: VerificationResult;

  if (args.chain === "evm") {
    const vaaHex = ("0x" + vaaBytes.toString("hex")) as Hex;
    const client = createPublicClient({ transport: http(args.rpcUrl) });
    result = await verifyVaaEvm(client, args.verifierAddress as Address, vaaHex);
  } else {
    if (vaaType !== "Schnorr") {
      console.error("Solana verification currently only supports Schnorr VAAs");
      process.exit(1);
    }
    const connection = new Connection(args.rpcUrl, "confirmed");
    const programId = new PublicKey(args.verifierAddress || DEFAULT_SOLANA_PROGRAM_ID);
    result = await verifyVaaSolana(connection, programId, vaaBytes);
  }

  if (!result.verified) {
    console.error("VAA verification failed:");
    console.error(result.error);
    process.exit(1);
  }

  console.log("VAA verified successfully");
  console.log("================================================");
  if (args.chain === "evm") {
    const emitterChain = toMaybeUnknownChain(result.emitterChainId);
    console.log(`Emitter Chain: ${emitterChain} (${result.emitterChainId})`);
    console.log("Emitter Address:", result.emitterAddress);
    console.log("Sequence:", result.sequence.toString());
    console.log("Payload Offset:", result.payloadOffset);
  } else {
    console.log("(Solana verify_vaa does not return parsed VAA data)");
  }
  console.log("================================================");
}

await main().catch((error: unknown) => { console.error(error); process.exit(1); });
