import fs from "fs";
import { ethers } from "ethers";
import { Connection, Keypair, PublicKey, Transaction } from "@solana/web3.js";
import { Program } from "@coral-xyz/anchor";
import yargs from "yargs";
import { hideBin } from 'yargs/helpers';
import { errorStack } from '@xlabs-xyz/peer-lib';
import { deriveSchnorrKeyPda, deriveLatestKeyPda } from "@xlabs-xyz/tss-definitions"; 

import {idl, VerificationV2} from "../idl/verification_v2.js";

// Default contract address for WormholeVerifier
const DEFAULT_EVM_CONTRACT_ADDRESS = "0x0000000000000000000000000000000000000000"; // TODO: Update with actual deployed address
const DEFAULT_SOLANA_PROGRAM_ID = "GbFfTqMqKDgAMRH8VmDmoLTdvDd1853TnkkEwpydv3J6"; // TODO: Get it from the IDL file

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
  contractAddress: string;
  rpcUrl: string;
  signer:
    | {
      type: "keyfile";
      path: string;
    }
    | {
      type: "ledger";
      derivationPath: string;
    };
}

type EvmArgs = BaseArgs & ({
  command: "set-shard-id";
  guardianMessage: string;
} | {
  command: "append-schnorr";
  pullLimit: number;
  vaa: string;
} | {
  command: "pull-multisigs";
  pullLimit: number;
})

type SvmArgs = BaseArgs & {
  postedVaa: string;
  signatureSet: string;
  newKeyIndex: number;
  oldKeyIndex?: number;
}

// TODO: Use binary-layout for these
export function encodeSetShardId(guardianMessage: Buffer): string {
  // set_shard_id: opcode (1 byte) + guardian message data
  return ethers.solidityPacked(
    ['uint8', 'bytes'],
    [UPDATE_SET_SHARD_ID, `0x${guardianMessage.toString('hex')}`]
  );
}

export function encodeAppendSchnorrKey(vaa: Buffer): string {
  // append_schnorr_KEY: opcode (1 byte) + vaa length (2 bytes) + vaa data
  return ethers.solidityPacked(
    ['uint8', 'uint16', 'bytes'],
    [UPDATE_APPEND_SCHNORR_KEY, vaa.length, `0x${vaa.toString('hex')}`]
  );
}

export function encodePullMultisigKeyData(limit: number): string {
  // PULL_MULTISIG_KEY_DATA: opcode (1 byte) + limit (4 bytes)
  return ethers.solidityPacked(
    ['uint8', 'uint32'],
    [UPDATE_PULL_MULTISIG_KEY_DATA, limit]
  );
}

export function encodeUpdate(args: EvmArgs, dataBytes: Buffer): string {
  if (args.command === "append-schnorr") {
    const pullData = encodePullMultisigKeyData(args.pullLimit);
    const appendData = encodeAppendSchnorrKey(dataBytes);
    console.log(`Prepared pull-multisigs with limit ${args.pullLimit}`);
    console.log(`Prepared append-schnorr with ${dataBytes.length} bytes of data`);
    return ethers.solidityPacked(['bytes', 'bytes'], [pullData, appendData]);
  } else if (args.command === "set-shard-id") {
    console.log(`Prepared set-shard-id with ${dataBytes.length} bytes of data`);
    return encodeSetShardId(dataBytes);
  } else {
    console.log(`Prepared pull-multisigs with limit ${args.pullLimit}`);
    return encodePullMultisigKeyData(args.pullLimit);
  }
}

async function createEvmSigner(args: EvmArgs) {
  const provider = new ethers.JsonRpcProvider(args.rpcUrl, undefined, {staticNetwork: true});

  if (args.signer.type === "ledger") {
    const {LedgerSigner} = await import("@xlabs-xyz/ledger-signer-ethers-v6");
    // remove cast as any when ethers is made peer dependency of ledger signer
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
    return LedgerSigner.create(provider as any, args.signer.derivationPath);
  } else {
    const keyfile = fs.readFileSync(args.signer.path, {encoding: "utf8"});
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    return new ethers.Wallet(JSON.parse(keyfile), provider);
  }
}

async function executeEvmTransaction(args: EvmArgs, dataBytes: Buffer): Promise<void> {

  const signer = await createEvmSigner(args);

  const updateData = encodeUpdate(args, dataBytes);

  console.log(`Target contract: ${args.contractAddress}`);
  console.log(`RPC URL: ${args.rpcUrl}`);

  console.log('\nSending transaction...');
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
  const contract = new ethers.Contract(args.contractAddress, UPDATE_ABI, signer as any);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const tx = await contract.update(updateData);

  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  console.log(`Transaction sent: ${tx.hash}`);
  console.log('Waiting for confirmation...');

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  const receipt = await tx.wait();

  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  if (receipt.status !== 1) {
    console.error('Transaction confirmed, but execution failed');
    process.exit(1);
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  console.log(`Transaction confirmed in block ${receipt.blockNumber}`);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
  console.log(`Gas used: ${receipt.gasUsed.toString()}`);
}

async function createSvmSigner(args: SvmArgs) {
  let publicKey: PublicKey;
  let signTransaction: (tx: Transaction) => Promise<void> | void;
  if (args.signer.type === "ledger") {
    const {SolanaLedgerSigner} = await import("@xlabs-xyz/ledger-signer-solana");
    // remove cast as any when ethers is made peer dependency of ledger signer
    const signer = await SolanaLedgerSigner.create(args.signer.derivationPath);
    publicKey = new PublicKey(await signer.getAddress());
    signTransaction = async (tx: Transaction) => {
      const signature = await signer.signTransaction(tx.compileMessage().serialize());
      tx.addSignature(publicKey, signature);
    }
  } else {
    const keyfile = fs.readFileSync(args.signer.path, {encoding: "utf8"});
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const signer = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(keyfile)));
    publicKey = signer.publicKey;
    signTransaction = (tx: Transaction) => {
      tx.partialSign(signer);
    }
  }
  return {publicKey, signTransaction};
}

async function executeSolanaTransaction(args: SvmArgs): Promise<void> {
  const {publicKey, signTransaction} = await createSvmSigner(args);
  const connection = new Connection(args.rpcUrl, "confirmed");
  const programId = new PublicKey(args.contractAddress);
  const program = new Program<VerificationV2>(idl, {connection, publicKey});

  // TODO: post VAA here instead
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

  console.log('\nBuilding transaction...');
  const ix = await program.methods.appendSchnorrKey()
    .accountsPartial({
      payer: publicKey,
      vaa: postedVaa,
      signatureSet: signatureSet,
      latestKey: latestKeyPda,
      newSchnorrKey: newSchnorrKeyPda,
      oldSchnorrKey: oldSchnorrKeyPda,
    })
    .instruction();

  // Get recent blockhash and set fee payer before signing
  const tx = new Transaction().add(ix);
  tx.feePayer = publicKey;
  
  console.log('Sending transaction...');
  const blockhash = await connection.getLatestBlockhash();
  tx.recentBlockhash = blockhash.blockhash;
  
  await signTransaction(tx);
  const signature = await connection.sendRawTransaction(tx.serialize());
  const receipt = await connection.confirmTransaction({signature, ...blockhash}, "confirmed",);
  console.log(`Transaction confirmed: ${signature}`);
  if (receipt.value.err !== null) throw new Error(`Transaction failed: ${errorStack(receipt.value.err)}`);
}

function main() {
  const parser = yargs(hideBin(process.argv))
    .option('ledger', {
      description: 'Use Ledger hardware wallet for signing. ',
      type: 'string',
      demandOption: false,
      conflicts: ["signer"],
    })
    .option('key', {
      description: 'Path to key file.',
      type: 'string',
      demandOption: false,
      conflicts: ["ledger"],
    })
    .option('contract-address', {
      description: 'Address of the WormholeVerifier contract/program',
      type: 'string',
    })
    .option('rpc-url', {
      description: 'RPC endpoint URL for the target chain',
      type: 'string',
    })
    .command('svm', 'SVM commands',
      (yargs) => yargs
        .default("contract-address", DEFAULT_SOLANA_PROGRAM_ID)
        .default("rpc-url", 'https://api.mainnet-beta.solana.com')
        .command('append-schnorr <vaa>', 'Append a Schnorr key to the VerificationV2 contract',
        (yargs) => yargs
          // TODO: add option for priority fee
          // TODO: make as many of these options implicit as possible
          // start from a base64 VAA instead
          .option('posted-vaa', {
            description: 'Address of the posted VAA account',
            demandOption: true,
            type: 'string',
          })
          .option('signature-set', {
            description: 'Address of the signature set account',
            demandOption: true,
            type: 'string',
          })
          .option('new-key-index', {
            description: 'Index of the new schnorr key to create',
            demandOption: true,
            type: 'number',
          })
          .option('old-key-index', {
            description: 'Index of the old schnorr key (omit for init)',
            type: 'number',
          }),
        (args) => {
          let signer;
          if (args.ledger !== undefined) {
            signer = { type: "ledger", derivationPath: args.ledger } as const;
          } else {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            signer = { type: "keyfile", path: args.key! } as const;
          }

          return executeSolanaTransaction({...args, signer});
        }
      )
      .demandCommand(1, 'A command is required')
      .strictCommands()
    )
    .command('evm', 'EVM commands',
      (yargs) => yargs
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        .coerce("contract-address", (arg) => ethers.getAddress(arg))
        .default("contract-address", DEFAULT_EVM_CONTRACT_ADDRESS)
        .default("rpc-url", 'https://ethereum-rpc.publicnode.com')
        .option('pull-limit', {
          description: 'Maximum number of multisig sets to pull.',
          defaultDescription: '0: Pull all necessary multisig sets',
          type: 'number',
          default: 0,
        })
        .command('set-shard-id <guardian-message>', 'Set the shard ID of the guardian (EVM only)',
          (yargs) => yargs.positional('guardian-message', {
            description: 'Path to file containing base64-encoded signed guardian message',
            demandOption: true,
            type: 'string',
          })
          // TODO: add 1) sign shard id command 2) sign and set shard id command
          // TODO: add support for AWS KMS
          // .option('signer', {
          //   description: 'Path to guardian signer key file.',
          //   demandOption: false,
          //   type: 'string',
          // })
          ,
          (args) => {
            let signer;
            if (args.ledger !== undefined) {
              signer = { type: "ledger", derivationPath: args.ledger } as const;
            } else {
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              signer = { type: "keyfile", path: args.key! } as const;
            }
            const guardianMessage = Buffer.from(args.guardianMessage, 'base64');
            return executeEvmTransaction({...args, signer, command: "set-shard-id"}, guardianMessage);
          }
        )
        .command('append-schnorr <vaa>', 'Append a Schnorr key to the VerificationV2 contract',
          (yargs) => yargs
            .positional('vaa', {
              description: 'Base64 encoded governance VAA',
              demandOption: true,
              type: 'string',
            }),
          (args) => {
            let signer;
            if (args.ledger !== undefined) {
              signer = { type: "ledger", derivationPath: args.ledger } as const;
            } else {
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              signer = { type: "keyfile", path: args.key! } as const;
            }

            return executeEvmTransaction({...args, signer, command: "append-schnorr"}, Buffer.from(args.vaa, 'base64'));
          }
        )
        .command('pull-multisigs', 'Pull multisig sets from the core contract (EVM only)', undefined, (args) => {
          let signer;
          if (args.ledger !== undefined) {
            signer = { type: "ledger", derivationPath: args.ledger } as const;
          } else {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            signer = { type: "keyfile", path: args.key! } as const;
          }

          return executeEvmTransaction({...args, signer, command: "pull-multisigs"}, Buffer.alloc(0));
        })
        .demandCommand(1, 'A command is required')
        .strictCommands()
    )
    .demandCommand(1, 'A command is required')
    .strictCommands()
    .strictOptions()
    .help()
    .alias('help', 'h');

  return parser.parseAsync();
}

// Only run main if this file is executed directly (not imported for tests)
if (import.meta.url.endsWith(process.argv[1]?.replace(/\\/g, '/')) || 
    process.argv[1]?.includes('governance_client')) {
  main().catch((error: unknown) => {
    console.error(`[ERROR] Unhandled error: ${errorStack(error)}`);
    process.exit(1);
  });
}
