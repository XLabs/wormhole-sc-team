import {
  Network,
} from "@wormhole-foundation/sdk-base";
import { ComputeBudgetProgram, Connection, Keypair, PublicKey, Transaction, VersionedTransaction } from "@solana/web3.js";
import { VAA } from "@wormhole-foundation/sdk-definitions";
import { type AnySolanaAddress, SolanaAddress, SolanaUnsignedTransaction, SolanaChains } from '@wormhole-foundation/sdk-solana';
import { SolanaWormholeCore, utils as coreUtils } from '@wormhole-foundation/sdk-solana-core';

// Derive the schnorr key PDA from key index
export function deriveSchnorrKeyPda(programId: PublicKey, schnorrKeyIndex: number): PublicKey {
  const schnorrKeyIndexBuf = Buffer.alloc(4);
  schnorrKeyIndexBuf.writeUint32LE(schnorrKeyIndex);
  const seeds = [Buffer.from("schnorrkey"), schnorrKeyIndexBuf];
  const [pda] = PublicKey.findProgramAddressSync(seeds, programId);
  return pda;
}

// Derive the latest key PDA
export function deriveLatestKeyPda(programId: PublicKey): PublicKey {
  const seeds = [Buffer.from("latestkey")];
  const [pda] = PublicKey.findProgramAddressSync(seeds, programId);
  return pda;
}

export type SignTransactionFn = (tx: Transaction | VersionedTransaction) => Promise<void> | void;

/**
 * Hacked up postVaa.
 * The motivation for this hack is that `SolanaWormholeCore::postVaa` doesn't let you override the signature set keypair
 * nor tell you what the signature set public key is even after generating one.
 * Note that this breaks the `client.postVaa` method after using once. Whenever you want to post a VAA, you should use this function instead.
 */
export async function postVaa<N extends Network>(
  client: SolanaWormholeCore<N, "Solana" | "Fogo">,
  payerPublicKey: PublicKey,
  payerSign: SignTransactionFn,
  vaa: VAA | VAA<"Uint8Array">,
  signatureSet = Keypair.generate(),
  priorityFee = 0n,
) {
  client.postVaa = async function *postVaa(sender: AnySolanaAddress, vaa: VAA) {
    const postedVaaAddress = coreUtils.derivePostedVaaKey(
      this.coreBridge.programId,
      Buffer.from(vaa.hash),
    );

    // no need to do anything else, this vaa is posted
    const isPosted = await this.connection.getAccountInfo(postedVaaAddress);
    if (isPosted) return;

    const senderAddr = new SolanaAddress(sender).unwrap();

    const verifySignaturesInstructions =
      await coreUtils.createVerifySignaturesInstructions(
        this.connection,
        this.coreBridge.programId,
        senderAddr,
        vaa,
        signatureSet.publicKey,
      );

    // Create a new transaction for every 2 instructions
    for (let i = 0; i < verifySignaturesInstructions.length; i += 2) {
      const verifySigTx = new Transaction().add(
        ...verifySignaturesInstructions.slice(i, i + 2),
      );
      verifySigTx.feePayer = senderAddr;
      if (priorityFee > 0n) {
        verifySigTx.add(ComputeBudgetProgram.setComputeUnitPrice({microLamports: priorityFee}));
      }
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      yield this["createUnsignedTx"](
        { transaction: verifySigTx, signers: [signatureSet] },
        'Core.VerifySignature',
        true,
      );
    }

    // Finally create the VAA posting transaction
    const postVaaTx = new Transaction().add(
      coreUtils.createPostVaaInstruction(
        this.connection,
        this.coreBridge.programId,
        senderAddr,
        vaa,
        signatureSet.publicKey,
      ),
    );
    postVaaTx.feePayer = senderAddr;
    if (priorityFee > 0n) {
      postVaaTx.add(ComputeBudgetProgram.setComputeUnitPrice({microLamports: priorityFee}));
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    yield this["createUnsignedTx"]({ transaction: postVaaTx }, 'Core.PostVAA');
  }

  const txs = client.postVaa(payerPublicKey, vaa);
  await send(client.connection, txs, payerSign);

  return {
    postedVaa: coreUtils.derivePostedVaaKey(client.coreBridge.programId, Buffer.from(vaa.hash)),
    signatureSet: signatureSet.publicKey,
  };
}

type YieldedTx<N extends Network, C extends SolanaChains> = AsyncGenerator<SolanaUnsignedTransaction<N, C>>;

async function send<N extends Network, C extends SolanaChains>(
  connection: Connection,
  txs: YieldedTx<N, C>,
  signTransaction: SignTransactionFn,
) {
  const signatures: string[] = [];

  for await (const { transaction: { transaction, signers } } of txs) {
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    if ("version" in transaction) {
      transaction.message.recentBlockhash = blockhash;
      if (signers !== undefined && signers.length > 0) {
        transaction.sign(signers);
      }
    } else {
      transaction.recentBlockhash = blockhash;
      if (signers !== undefined && signers.length > 0) {
        transaction.partialSign(...signers);
      }
    }

    await signTransaction(transaction);

    // Send & confirm
    const sig = await connection.sendRawTransaction(transaction.serialize());

    await connection.confirmTransaction(
      { signature: sig, blockhash, lastValidBlockHeight },
    );

    signatures.push(sig);
  }

  return signatures;
}