import fs from "fs";
import { ethers } from "ethers";
import type { Signer as EthersSigner } from "ethers";
import { Connection, Keypair, PublicKey, sendAndConfirmTransaction, Transaction, type Signer } from "@solana/web3.js";
import { Program, AnchorProvider, Wallet } from "@coral-xyz/anchor";
import yargs, { type Argv } from "yargs";
import { hideBin } from 'yargs/helpers';
import { parseGuardianKey, errorMsg, errorStack } from '@xlabs-xyz/peer-lib';
import * as TransportNodeHid from "@ledgerhq/hw-transport-node-hid";
import * as SolanaApp from "@ledgerhq/hw-app-solana";

import type { VerificationV2 } from "../../../src/solana/target/types/verification_v2.js";
// Import IDL - copied to build output during build step
import idlJson from "./verification_v2.json" with { type: "json" };
const idl = idlJson as VerificationV2;

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
  chain: "evm" | "solana";
  contractAddress: string;
  rpcUrl: string;
  signer: string;
}

type EvmArgs = BaseArgs & {
  chain: "evm";
  chainId: number;
  limit: number;
  ledger?: boolean;
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
  ledger?: boolean;
}

type Args = EvmArgs | SolanaArgs;

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
  if (args.command === "append_schnorr") {
    const pullData = encodePullMultisigKeyData(args.limit);
    const appendData = encodeAppendSchnorrKey(dataBytes);
    console.log(`Prepared pull_multisigs with limit ${args.limit}`);
    console.log(`Prepared append_schnorr with ${dataBytes.length} bytes of data`);
    return ethers.solidityPacked(['bytes', 'bytes'], [pullData, appendData]);
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

// ============================================================================
// Signer Classes
// ============================================================================

// EVM file-based signer
class EvmSigner {
  private wallet: ethers.Wallet;
  
  constructor(signerPath: string, provider: ethers.Provider) {
    try {
      const signerFile = fs.readFileSync(signerPath, 'utf-8');
      const keyBytes = parseGuardianKey(signerFile);
      const signerKey = `0x${Buffer.from(keyBytes).toString('hex')}`;
      this.wallet = new ethers.Wallet(signerKey, provider);
      console.log(`Using file-based EVM signer: ${this.wallet.address}`);
    } catch (error) {
      console.error(`Failed to parse EVM signer file: ${errorMsg(error)}`);
      throw error;
    }
  }
  
  getAddress(): string {
    return this.wallet.address;
  }
  
  getSigner(): ethers.Wallet {
    return this.wallet;
  }
}

// EVM Ledger signer
class EvmLedgerSigner {
  private ledgerSigner: EthersSigner;
  
  private constructor(ledgerSigner: EthersSigner) {
    this.ledgerSigner = ledgerSigner;
  }
  
  static async create(provider: ethers.Provider): Promise<EvmLedgerSigner> {
    try {
      // Dynamic import using Function constructor to prevent vite from analyzing it
      const importLedger = new Function('specifier', 'return import(specifier)');
      const ledgerModule = await importLedger("@xlabs-xyz/ledger-ethers-signer");
      const LedgerSigner = ledgerModule.LedgerSigner || (ledgerModule as any).default?.LedgerSigner || (ledgerModule as any).default;
      const ledgerSigner = new LedgerSigner(provider, "hid");
      const address = await ledgerSigner.getAddress();
      console.log(`Using Ledger EVM signer: ${address}`);
      return new EvmLedgerSigner(ledgerSigner);
    } catch (error) {
      console.error(`Failed to initialize Ledger: ${errorMsg(error)}`);
      console.error('Make sure your Ledger device is connected and the Ethereum app is open.');
      throw error;
    }
  }
  
  async getAddress(): Promise<string> {
    return await this.ledgerSigner.getAddress();
  }
  
  getSigner(): EthersSigner {
    return this.ledgerSigner;
  }
}

// Solana file-based signer
class SolanaSigner implements Signer {
  publicKey: PublicKey;
  secretKey: Uint8Array;
  private keypair: Keypair;
  
  constructor(signerPath: string) {
    try {
      const signerFile = fs.readFileSync(signerPath, 'utf-8');
      const keyBytes = parseGuardianKey(signerFile);
      
      // Solana Keypair.fromSecretKey expects 64 bytes (32-byte seed + 32-byte public key)
      // If we have 32 bytes, we need to derive the Ed25519 keypair
      // If we have 64 bytes, we can use it directly
      if (keyBytes.length === 32) {
        this.keypair = Keypair.fromSeed(keyBytes);
      } else if (keyBytes.length === 64) {
        this.keypair = Keypair.fromSecretKey(keyBytes);
      } else {
        throw new Error(`Invalid key length: expected 32 or 64 bytes, got ${keyBytes.length}`);
      }
      
      this.publicKey = this.keypair.publicKey;
      this.secretKey = this.keypair.secretKey;
      console.log(`Using file-based Solana signer: ${this.publicKey.toBase58()}`);
    } catch (error) {
      console.error(`Failed to parse Solana signer file: ${errorMsg(error)}`);
      throw error;
    }
  }
  
  getKeypair(): Keypair {
    return this.keypair;
  }
  
  async signTransaction(tx: Transaction): Promise<Transaction> {
    tx.partialSign(this.keypair);
    return tx;
  }
  
  async signAllTransactions(txs: Transaction[]): Promise<Transaction[]> {
    return txs.map(tx => {
      tx.partialSign(this.keypair);
      return tx;
    });
  }
}

// Solana Ledger signer
class SolanaLedgerSigner implements Signer {
  publicKey: PublicKey;
  secretKey: Uint8Array; // Required by Signer interface, but not used for Ledger
  private solanaApp: SolanaApp.default;
  private derivationPath: number[];

  private constructor(solanaApp: SolanaApp.default, publicKey: PublicKey, derivationPath: number[] = [44, 501, 0, 0]) {
    this.solanaApp = solanaApp;
    this.publicKey = publicKey;
    this.derivationPath = derivationPath;
    this.secretKey = new Uint8Array(64); // Dummy secret key - not used for Ledger
  }
  
  static async create(): Promise<SolanaLedgerSigner> {
    try {
      // Initialize Ledger transport
      // Note: Ledger packages use complex ESM exports that TypeScript struggles with
      // @ts-ignore - Runtime behavior is correct despite type errors
      const Transport = TransportNodeHid.default || TransportNodeHid;
      // @ts-ignore
      const transport = await Transport.create();
      // @ts-ignore
      const Solana = SolanaApp.default || SolanaApp;
      // @ts-ignore
      const solanaApp = new Solana(transport);
      
      // Get public key from Ledger (using default derivation path)
      // Derivation path format: "44'/501'/0'/0'" for Solana
      const derivationPath = [44, 501, 0, 0]; // Standard Solana derivation path
      const derivationPathStr = derivationPath.map((n, i) => i < 2 ? `${n}'` : n.toString()).join('/');
      const { publicKey } = await solanaApp.getPublicKey(derivationPathStr);
      
      const ledgerPublicKey = new PublicKey(publicKey);
      console.log(`Using Ledger Solana signer: ${ledgerPublicKey.toBase58()}`);
      
      return new SolanaLedgerSigner(solanaApp, ledgerPublicKey, derivationPath);
    } catch (error) {
      console.error(`Failed to initialize Ledger: ${errorMsg(error)}`);
      console.error('Make sure your Ledger device is connected and the Solana app is open.');
      throw error;
    }
  }

  async signTransaction(tx: Transaction): Promise<Transaction> {
    // Serialize the transaction
    const message = tx.serializeMessage();
    
    // Convert derivation path to string format (e.g., "44'/501'/0'/0'")
    const derivationPathStr = this.derivationPath.map((n, i) => i < 2 ? `${n}'` : n.toString()).join('/');
    
    // Sign with Ledger
    const result = await this.solanaApp.signTransaction(derivationPathStr, message);
    
    // Ledger returns { signature: Buffer }, extract the signature
    const signature = result.signature || result;
    const sigBuffer = Buffer.isBuffer(signature) ? signature : Buffer.from(signature);
    tx.addSignature(this.publicKey, sigBuffer);
    
    return tx;
  }

  async signAllTransactions(txs: Transaction[]): Promise<Transaction[]> {
    // Sign each transaction sequentially
    const signedTxs: Transaction[] = [];
    for (const tx of txs) {
      signedTxs.push(await this.signTransaction(tx));
    }
    return signedTxs;
  }
}

// ============================================================================
// Unified Signer Factory
// ============================================================================

type SignerConfig = {
  chain: 'evm' | 'solana';
  ledger: boolean;
  signerPath?: string;  // Required if ledger=false
  rpcUrl: string;
};

async function createSigner(config: SignerConfig): Promise<EvmSigner | EvmLedgerSigner | SolanaSigner | SolanaLedgerSigner> {
  if (config.chain === 'evm') {
    const provider = new ethers.JsonRpcProvider(config.rpcUrl);
    if (config.ledger) {
      return await EvmLedgerSigner.create(provider);
    } else {
      if (!config.signerPath) {
        throw new Error('signerPath is required for file-based signing');
      }
      return new EvmSigner(config.signerPath, provider);
    }
  } else {
    // Solana
    if (config.ledger) {
      return await SolanaLedgerSigner.create();
    } else {
      if (!config.signerPath) {
        throw new Error('signerPath is required for file-based signing');
      }
      return new SolanaSigner(config.signerPath);
    }
  }
}

async function executeEvmTransaction(args: EvmArgs, dataBytes: Buffer): Promise<void> {
  // Validate contract address
  if (!ethers.isAddress(args.contractAddress)) {
    console.error("Contract address must be a valid hex address");
    process.exit(1);
  }

  // Create signer using unified factory
  const signer = await createSigner({
    chain: 'evm',
    ledger: args.ledger || false,
    signerPath: args.signer,
    rpcUrl: args.rpcUrl,
  });

  const updateData = encodeUpdate(args, dataBytes);

  console.log(`Target contract: ${args.contractAddress}`);
  console.log(`Chain ID: ${args.chainId}`);
  console.log(`RPC URL: ${args.rpcUrl}`);

  try {
    console.log('\nSending transaction...');
    // Get the underlying ethers signer - both EvmSigner and EvmLedgerSigner have getSigner()
    const ethersSigner = (signer as EvmSigner | EvmLedgerSigner).getSigner();
    const contract = new ethers.Contract(args.contractAddress, UPDATE_ABI, ethersSigner);
    const tx = await contract.update(updateData);

    console.log(`Transaction sent: ${tx.hash}`);
    console.log('Waiting for confirmation...');

    const receipt = await tx.wait();

    if (receipt.status === 1) {
      console.log(`Transaction confirmed in block ${receipt.blockNumber}`);
      console.log(`Gas used: ${receipt.gasUsed.toString()}`);
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
  // Create signer using unified factory
  const signer = await createSigner({
    chain: 'solana',
    ledger: args.ledger || false,
    signerPath: args.signer,
    rpcUrl: args.rpcUrl,
  });

  // Type assertion since we know this is a Solana signer
  const solanaSigner = signer as SolanaSigner | SolanaLedgerSigner;
  const signerPublicKey = solanaSigner.publicKey;
  const connection = new Connection(args.rpcUrl, "confirmed");
  const programId = new PublicKey(args.contractAddress || DEFAULT_SOLANA_PROGRAM_ID);

  // Create wallet/provider - all signer classes implement the Signer interface
  const wallet = solanaSigner instanceof SolanaSigner 
    ? new Wallet(solanaSigner.getKeypair())
    : {
        publicKey: solanaSigner.publicKey,
        signTransaction: (tx: Transaction) => solanaSigner.signTransaction(tx),
        signAllTransactions: (txs: Transaction[]) => solanaSigner.signAllTransactions(txs),
      } as Wallet;
  
  const provider = new AnchorProvider(connection, wallet, { commitment: "confirmed" });
  const program = new Program<VerificationV2>(idl, provider);

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
        payer: signerPublicKey,
        vaa: postedVaa,
        signatureSet: signatureSet,
        latestSchnorrKey: latestKeyPda,
        newSchnorrKey: newSchnorrKeyPda,
        oldSchnorrKey: oldSchnorrKeyPda,
      })
      .instruction();

    // Get recent blockhash and set fee payer before signing
    const { blockhash } = await connection.getLatestBlockhash();
    const tx = new Transaction().add(ix);
    tx.feePayer = signerPublicKey;
    tx.recentBlockhash = blockhash;
    
    console.log('Sending transaction...');
    
    // Sign and send transaction based on signer type
    if (solanaSigner instanceof SolanaSigner) {
      const signature = await sendAndConfirmTransaction(connection, tx, [solanaSigner.getKeypair()], {
        commitment: "confirmed",
      });
      console.log(`Transaction confirmed: ${signature}`);
    } else {
      // For Ledger, we need to sign the transaction first
      const signedTx = await solanaSigner.signTransaction(tx);
      const signature = await connection.sendRawTransaction(signedTx.serialize());
      await connection.confirmTransaction(signature, "confirmed");
      console.log(`Transaction confirmed: ${signature}`);
    }
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
     .option('ledger', {
       description: 'Use Ledger hardware wallet for signing',
       type: 'boolean',
       default: false,
     })
     .option('signer', {
       description: 'Path to signer key file (GPG armor guardian key for both EVM and Solana). Optional when --ledger is used.',
       demandOption: false,
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

    const postedVaa = parsedArgs.postedVaa as string | undefined;
    const signatureSet = parsedArgs.signatureSet as string | undefined;
    const newKeyIndex = parsedArgs.newKeyIndex as number | undefined;
    const oldKeyIndex = parsedArgs.oldKeyIndex as number | undefined;

    if (!postedVaa || !signatureSet || newKeyIndex === undefined) {
      console.error("Solana append_schnorr requires --posted-vaa, --signature-set, and --new-key-index");
      process.exit(1);
    }

    // Validate signer requirement
    if (!parsedArgs.ledger && !parsedArgs.signer) {
      console.error("Either --signer or --ledger must be provided");
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
      signer: parsedArgs.signer || '', // Required by type but not used when ledger is true
      ledger: parsedArgs.ledger || false,
      postedVaa: postedVaa!, // Safe after check above
      signatureSet: signatureSet!, // Safe after check above
      newKeyIndex: newKeyIndex!, // Safe after check above
      oldKeyIndex,
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

    // Validate signer requirement
    if (!parsedArgs.ledger && !parsedArgs.signer) {
      console.error("Either --signer or --ledger must be provided");
      process.exit(1);
    }

    const args: EvmArgs = {
      chain: "evm",
      command: command as EvmArgs["command"],
      contractAddress: parsedArgs.contractAddress,
      rpcUrl: parsedArgs.rpcUrl,
      chainId: parsedArgs.chainId,
      signer: parsedArgs.signer || '', // Required by type but not used when ledger is true
      ledger: parsedArgs.ledger || false,
      limit: parsedArgs.limit,
      ...(command === "set_shard_id" ? { guardianMessage: parsedArgs.guardianMessage as string } : {}),
      ...(command === "append_schnorr" ? { vaa: parsedArgs.vaa as string } : {}),
    } as EvmArgs;

    await executeEvmTransaction(args, dataBytes);
  }
}

// Only run main if this file is executed directly (not imported for tests)
if (import.meta.url.endsWith(process.argv[1]?.replace(/\\/g, '/')) || 
    process.argv[1]?.includes('governance_client')) {
  main().catch((error: unknown) => {
    console.error(`[ERROR] Unhandled error: ${errorStack(error)}`);
    process.exit(1);
  });
}
