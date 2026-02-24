import { Program } from "@coral-xyz/anchor";
import { ComputeBudgetProgram, Connection, Keypair, PublicKey, Transaction, VersionedTransaction } from "@solana/web3.js";
import { Chain, contracts, createVAA, deserializeUnknownVaa, encoding } from "@wormhole-foundation/sdk";
import { SolanaWormholeCore } from '@wormhole-foundation/sdk-solana-core';
import { deriveSchnorrKeyPda, deriveLatestKeyPda, postVaa } from "@xlabs-xyz/tss-definitions";
import {
  errorStack,
  findUnusedNonce,
  getEcXYFromCertPem,
  getGuardianIndex,
  parseGuardianKey,
  readCurrentSchnorrKeyIndex,
  signRegisterGuardian
} from '@xlabs-xyz/peer-lib';
import { ethers, JsonRpcProvider } from "ethers";
import fs from "fs";
import yargs, {Argv} from "yargs";
import { hideBin } from 'yargs/helpers';

import { idl, VerificationV2 } from "../idl/verification_v2.js";

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

type SignerOption = {
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

type GuardianSignerOption = {
  command: "sign-and-set-shard-id";
  messageSigner: string;
  rpcUrl?: string;
}

type BaseArgs = {
  contractAddress: string;
  rpcUrl: string;
} & SignerOption;

type EvmArgs = BaseArgs & {
} & (/*{
  command: "set-shard-id";
  guardianMessage: string;
}*/ | {
  command: "sign-and-set-shard-id";
  messageSigner: string;
} | {
  command: "append-schnorr";
  pullLimit: number;
  vaa: string;
} | {
  command: "pull-multisigs";
  pullLimit: number;
})

type SvmArgs = BaseArgs & {
  coreV1Address: string;
  network: string;
  chain: string;
  vaa: string;
  priorityFee: bigint;
}

// TODO: Use binary-layout for these
function encodeSetShardId(guardianMessage: Uint8Array): string {
  // set_shard_id: opcode (1 byte) + guardian message data
  return ethers.solidityPacked(
    ['uint8', 'bytes'],
    [UPDATE_SET_SHARD_ID, encoding.hex.encode(guardianMessage)]
  );
}

function encodeAppendSchnorrKey(vaa: Uint8Array): string {
  // append_schnorr_KEY: opcode (1 byte) + vaa length (2 bytes) + vaa data
  return ethers.solidityPacked(
    ['uint8', 'uint16', 'bytes'],
    [UPDATE_APPEND_SCHNORR_KEY, vaa.length, encoding.hex.encode(vaa, true)]
  );
}

function encodePullMultisigKeyData(limit: number): string {
  // PULL_MULTISIG_KEY_DATA: opcode (1 byte) + limit (4 bytes)
  return ethers.solidityPacked(
    ['uint8', 'uint32'],
    [UPDATE_PULL_MULTISIG_KEY_DATA, limit]
  );
}

function encodeUpdate(args: EvmArgs, dataBytes: Uint8Array): string {
  if (args.command === "append-schnorr") {
    const pullData = encodePullMultisigKeyData(args.pullLimit);
    const appendData = encodeAppendSchnorrKey(dataBytes);
    console.log(`Prepared pull-multisigs with limit ${args.pullLimit}`);
    console.log(`Prepared append-schnorr with ${dataBytes.length} bytes of data`);
    return ethers.solidityPacked(['bytes', 'bytes'], [pullData, appendData]);
  } else if (/*args.command === "set-shard-id" ||*/ args.command === "sign-and-set-shard-id") {
    console.log(`Prepared set-shard-id with ${dataBytes.length} bytes of data`);
    return encodeSetShardId(dataBytes);
  } else {
    console.log(`Prepared pull-multisigs with limit ${args.pullLimit}`);
    return encodePullMultisigKeyData(args.pullLimit);
  }
}

async function createEvmTxSigner(args: EvmArgs) {
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

function createEvmGuardianSigner(args: GuardianSignerOption): ethers.Signer {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (args.command !== "sign-and-set-shard-id")
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    throw new Error(`Missing arguments for guardian signer in ${args.command}`);

  const provider = args.rpcUrl !== undefined
    ? new ethers.JsonRpcProvider(args.rpcUrl, undefined, {staticNetwork: true})
    : undefined;

  if (args.messageSigner.startsWith("keyfile:")) {
    const path = args.messageSigner.substring(args.messageSigner.indexOf(":"));
    const keyfile = fs.readFileSync(path, {encoding: "utf8"});
    const key = encoding.hex.encode(parseGuardianKey(keyfile), true);
    return new ethers.Wallet(key, provider);
  } else if (args.messageSigner.startsWith("arn:")) {
    throw new Error("TODO: Implement with KmsSigner");
  } else {
    throw new Error(`Unknown message signer schema`);
  }
}

async function executeEvmTransaction(args: EvmArgs, dataBytes: Uint8Array = Uint8Array.from([])): Promise<void> {

  const signer = await createEvmTxSigner(args);

  const updateData = encodeUpdate(args, dataBytes);

  console.log(`Target contract: ${args.contractAddress}`);
  console.log(`RPC URL: ${args.rpcUrl}`);

  console.log('\nSending transaction...');
  let contractAddress = args.contractAddress;
  const contract = new ethers.Contract(contractAddress, UPDATE_ABI, signer as ethers.Signer);
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
  let signTransaction: (tx: Transaction | VersionedTransaction) => Promise<void> | void;
  if (args.signer.type === "ledger") {
    const {SolanaLedgerSigner} = await import("@xlabs-xyz/ledger-signer-solana");
    const signer = await SolanaLedgerSigner.create(args.signer.derivationPath);
    publicKey = new PublicKey(await signer.getAddress());
    signTransaction = async (tx: Transaction | VersionedTransaction) => {
      const signature = await signer.signTransaction(Buffer.from(tx.serialize({ verifySignatures: false, requireAllSignatures: false })));
      tx.addSignature(publicKey, signature);
    }
  } else {
    const keyfile = fs.readFileSync(args.signer.path, {encoding: "utf8"});
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const signer = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(keyfile)));
    publicKey = signer.publicKey;
    signTransaction = (tx: Transaction | VersionedTransaction) => {
      if ("version" in tx) {
        tx.sign([signer]);
      } else {
        tx.partialSign(signer);
      }
    }
  }
  return {publicKey, signTransaction};
}

async function executeSvmTransaction(args: SvmArgs): Promise<void> {
  const {publicKey, signTransaction} = await createSvmSigner(args);
  const connection = new Connection(args.rpcUrl, "confirmed");
  let chainContracts = { coreBridge: args.coreV1Address };
  const client = new SolanaWormholeCore(args.network as "Mainnet" | "Testnet", args.chain as "Solana" | "Fogo", connection, chainContracts);
  const verificationV2Pid = new PublicKey(args.contractAddress);
  const program = new Program<VerificationV2>(idl, {connection, publicKey: verificationV2Pid});

  // TODO: check that the payload looks good
  // define layout for governance message to address that
  const parsedVaa = deserializeUnknownVaa(encoding.b64.decode(args.vaa));
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
  const vaaAccounts = await postVaa(client, publicKey, signTransaction, createVAA("Uint8Array", parsedVaa as any), undefined, args.priorityFee);

  const postedVaa = new PublicKey(vaaAccounts.postedVaa);
  const signatureSet = new PublicKey(vaaAccounts.signatureSet);
  // We log these as soon as possible so they can be reused if something goes wrong with the following tx.
  console.log(`Posted VAA: ${postedVaa.toBase58()}`);
  console.log(`Signature Set: ${signatureSet.toBase58()}`);

  const latestKeyPda = deriveLatestKeyPda(verificationV2Pid);
  const currentKey = await program.account.latestKeyAccount.fetchNullable(latestKeyPda);

  let oldSchnorrKeyPda: PublicKey | undefined, newKeyIndex: number;
  if (currentKey !== null) {
    newKeyIndex = (await program.account.schnorrKeyAccount.fetch(currentKey.account)).index + 1;
    oldSchnorrKeyPda = currentKey.account;
  } else {
    newKeyIndex = 0;
  }
  const newSchnorrKeyPda = deriveSchnorrKeyPda(verificationV2Pid, newKeyIndex);

  console.log(`Target program: ${verificationV2Pid.toBase58()}`);
  console.log(`Latest Key PDA: ${latestKeyPda.toBase58()}`);
  console.log(`New Schnorr Key PDA: ${newSchnorrKeyPda.toBase58()}`);
  console.log(`New Schnorr Key index: ${newKeyIndex}`);
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
  if (args.priorityFee > 0n) {
    tx.add(ComputeBudgetProgram.setComputeUnitPrice({microLamports: args.priorityFee}));
  }
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

function withTxSigner<T>(yargsParser: Argv<T>): Argv<T & SignerOption> {
  return yargsParser
    .option('ledger', {
      description: 'Use Ledger hardware wallet for signing. ',
      type: 'string',
      demandOption: false,
      conflicts: ["signer"],
      group: "Tx signing",
    })
    .option('key', {
      description: 'Path to key file.',
      type: 'string',
      demandOption: false,
      conflicts: ["ledger"],
      group: "Tx signing",
    })
    .check((args) => {
      // The conflicts property checks the opposite case
      if (args.ledger === undefined && args.key === undefined)
        throw new Error("Exactly one of --key or --ledger must be provided to sign transactions.");
    })
    .middleware((args) => {
      let signer;
      if (args.ledger !== undefined) {
        signer = { type: "ledger", derivationPath: args.ledger } as const;
      } else {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        signer = { type: "keyfile", path: args.key! } as const;
      }
      (args as (typeof args & SignerOption)).signer = signer;
    }) as unknown as Argv<T & SignerOption>
}

function main() {
  const parser = yargs(hideBin(process.argv))
    .option('contract-address', {
      description: 'Address of the WormholeVerifier contract/program.',
      demandOption: false,
      type: 'string',
    })
    .option('rpc-url', {
      description: 'RPC endpoint URL for the target chain',
      type: 'string',
    })
    .command('svm', 'SVM commands',
      (yargs) => yargs
        .default("rpc-url", 'https://api.mainnet-beta.solana.com')
        .default("contract-address", DEFAULT_SOLANA_PROGRAM_ID)
        .command('append-schnorr', 'Append a Schnorr key to the VerificationV2 contract',
        (yargs) => withTxSigner(yargs)
          .option('vaa', {
            description: 'VAA in base64',
            demandOption: true,
            type: 'string',
          })
          .option('network', {
            description: 'Network where operation will be executed',
            demandOption: true,
            choices: ["Mainnet", "Testnet"],
            coerce: (arg) => arg as "Mainnet" | "Testnet",
          })
          // Note that we are forced to require the chain option here because `SolanaWormholeCore` requires this parameter too.
          // Ideally we could demand either `network + chain` or `core-v1-address`
          .option('chain', {
            description: 'Chain where operation will be executed',
            demandOption: true,
            choices: ["Solana", "Fogo"],
            coerce: (arg) => arg as "Solana" | "Fogo",
          })
          .option('priority-fee', {
            description: 'Priority fee in µLamport per compute unit',
            demandOption: false,
            default: 0n,
            type: 'string',
            coerce: (arg: string) => BigInt(arg),
          })
          .option('core-v1-address', {
            description: 'Program ID of Core v1 contract.',
            demandOption: false,
            type: "string",
          }),
        (args) => {
          let coreV1Address: string | undefined = contracts.coreBridge(args.network, args.chain);
          if (args.coreV1Address !== undefined) {
            coreV1Address = args.coreV1Address;
          }

          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          if (coreV1Address === undefined) {
            throw new Error(`Program ID for Core v1 contract is missing. Please provide through --core-v1-address.`);
          }

          return executeSvmTransaction({...args, coreV1Address});
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
        // TODO: create an offline signing flow
        // .command('prepare-message-shard-id', 'Prepare the shard ID message',
        //   (yargs) => yargs,
        //   (args) => {
        //     throw new Error("Unimplemented");
        //   }
        // )
        // .command('sign-shard-id', 'Sign the shard ID message with the guardian key',
        //   (yargs) => yargs
        //     .option('message-signer', {
        //       description: 'Must be one of: 1) "keyfile:<key path>" 2) "arn:<AWS KMS ARN>"\n' +
        //       'For 1, the keyfile must be the guardian key encoded in the wormhole guardian private key standard.\n' +
        //       'For 2, bear in mind that the host of this script needs permission to access the key.',
        //       demandOption: true,
        //       type: 'string',
        //     }),
        //   (args) => {
        //     const guardianMessage = Buffer.from(args.guardianMessage, 'base64');
        //     return executeEvmTransaction({...args, command: "set-shard-id"}, guardianMessage);
        //   }
        // )
        // .command('set-shard-id <guardian-message>', 'Set the shard ID of the guardian',
        //   (yargs) => withTxSigner(yargs)
        //     .positional('guardian-message', {
        //       description: 'Base64-encoded signed guardian message',
        //       demandOption: true,
        //       type: 'string',
        //     }),
        //   (args) => {
        //     const guardianMessage = Buffer.from(args.guardianMessage, 'base64');
        //     return executeEvmTransaction({...args, command: "set-shard-id"}, guardianMessage);
        //   }
        // )
        .command('sign-and-set-shard-id', 'Set the shard ID of the guardian',
          (yargs) => withTxSigner(yargs)
            .option('message-signer', {
              description: 'Must be one of: 1) "keyfile:<key path>" 2) "arn:<AWS KMS ARN>"\n' +
              'For 1, the keyfile must be the guardian key encoded in the wormhole guardian private key standard.\n' +
              'For 2, bear in mind that the host of this script needs permission to access the key.',
              demandOption: true,
              type: 'string',
            })
            .option('tls-cert', {
              description: 'Path to the TLS certificate.',
              demandOption: true,
              type: 'string',
            })
            .option('network', {
              description: 'Network where operation will be executed.',
              conflicts: ["core-v1-address"],
              demandOption: false,
              choices: ["Mainnet", "Testnet"],
              coerce: (arg) => arg as "Mainnet" | "Testnet",
            })
            .option('chain', {
              description: 'Chain where operation will be executed.',
              conflicts: ["core-v1-address"],
              demandOption: false,
              coerce: (arg) => arg as Chain,
            })
            .option('core-v1-address', {
              description: 'EVM address of Core v1 contract.',
              conflicts: ["network", "chain"],
              demandOption: false,
              type: "string",
            })
            ,
          async (args) => {
            let coreV1Address: string | undefined;
            if (args.network !== undefined && args.chain !== undefined) {
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
              coreV1Address = contracts.coreBridge(args.network, args.chain as any);
              if (coreV1Address === undefined)
                throw new Error(`Unknown EVM address for core v1 contract in network ${args.network} and chain ${args.chain}.
Please use --core-v1-address to input address manually.`);
            } else if (args.coreV1Address !== undefined) {
              coreV1Address = args.coreV1Address;
            } else {
              throw new Error(`EVM address for Core v1 contract is missing.
Please provide --network and --chain to retrieve address from the Wormhole SDK.`);
            }

            const provider = new JsonRpcProvider(args.rpcUrl, undefined, { staticNetwork: true });
            const schnorrKeyIndex = await readCurrentSchnorrKeyIndex(provider, args.contractAddress);

            const certificate = fs.readFileSync(args.tlsCert, {encoding: "utf8"});
            const {pubKeyX, pubKeyY} = getEcXYFromCertPem(certificate);

            const messageSigner = createEvmGuardianSigner({
              ...args,
              command: "sign-and-set-shard-id" as const,
            });
            const guardianAddress = await messageSigner.getAddress();
            const guardianIndex = await getGuardianIndex(provider, coreV1Address, guardianAddress);

            const eip155Chain = (await provider.getNetwork()).chainId;

            const nonce = await findUnusedNonce(
              provider,
              args.contractAddress,
              schnorrKeyIndex,
              guardianIndex
            );

            const signedMessage = await signRegisterGuardian(messageSigner, eip155Chain, args.contractAddress, guardianIndex, {
              pubKeyX,
              pubKeyY,
              nonce,
              schnorrKeyIndex,
            });

            return executeEvmTransaction({...args, command: "sign-and-set-shard-id"}, signedMessage);
          }
        )
        .command('append-schnorr <vaa>', 'Append a Schnorr key to the VerificationV2 contract',
          (yargs) => withTxSigner(yargs)
            .positional('vaa', {
              description: 'Base64 encoded governance VAA',
              demandOption: true,
              type: 'string',
            }),
          (args) => {
            return executeEvmTransaction({...args, command: "append-schnorr"}, encoding.b64.decode(args.vaa));
          }
        )
        .command('pull-multisigs', 'Pull multisig sets from the core contract (EVM only)',
          (args) => withTxSigner(args),
          (args) => {
            return executeEvmTransaction({...args, command: "pull-multisigs"});
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
