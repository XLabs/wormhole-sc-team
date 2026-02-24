import crypto from "node:crypto";
import { ethers } from 'ethers';
import { registerGuardianLayout } from '@xlabs-xyz/tss-definitions';
import { deserialize, serialize } from 'binary-layout';
import { layoutItems } from '@wormhole-foundation/sdk-definitions';
import { encoding } from '@wormhole-foundation/sdk-base';

import {
  validateOrFail,
  uint32Schema,
  uint8Schema
} from './types.js';

const guardianRegisterTypes = {
  GuardianRegister: [
    { name: "schnorrKeyIndex", type: "uint32"  } as const,
    { name: "nonce",           type: "uint32"  } as const,
    { name: "pubKeyX",         type: "bytes32" } as const,
    { name: "pubKeyY",         type: "bytes32" } as const,
  ],
};

export type GuardianRegisterMessage = {
  schnorrKeyIndex: number;
  nonce: number;
  pubKeyX: string;
  pubKeyY: string;
};

function makeVerificationV2Domain(chainId: bigint, verifyingContract: string) {
  return {
    name: "Wormhole VerificationV2" as const,
    version: "1" as const,
    chainId,
    verifyingContract,
  };
}

/**
 * @param chainId EIP 155 chain id.
 * @param verifyingContract EVM address of the verifying contract.
 * @returns serialized signed register guardian message
 */
export async function signRegisterGuardian(
  signer: ethers.Signer,
  chainId: bigint,
  verifyingContract: string,
  guardianIndex: number,
  message: GuardianRegisterMessage,
): Promise<Uint8Array> {
  const domain = makeVerificationV2Domain(chainId, verifyingContract);
  const signature = deserialize(layoutItems.signatureItem, encoding.hex.decode(await signer.signTypedData(domain, guardianRegisterTypes, message)));

  return serialize(registerGuardianLayout, {
    ...message,
    pubKeyX: encoding.hex.decode(message.pubKeyX),
    pubKeyY: encoding.hex.decode(message.pubKeyY),
    guardianIndex,
    signature,
  });
}

async function readNonceBitmap(
  provider: ethers.Provider,
  verificationV2Address: string,
  schnorrKeyIndex: bigint,
  guardianIndex: bigint,
  nonceSlotOffset: bigint,
) {
  const SLOT_SCHNORR_NONCE_BITMAP = 6n << 64n;
  const nonceSlot =
      SLOT_SCHNORR_NONCE_BITMAP
    | (schnorrKeyIndex << 32n)
    | (guardianIndex << 24n)
    | nonceSlotOffset;

  const storage = await provider.getStorage(verificationV2Address, nonceSlot);
  return ethers.getBigInt(storage);
}

export async function isNonceUsed(
  provider: ethers.Provider,
  verificationV2Address: string,
  schnorrKeyIndex: number,
  guardianIndex: number,
  nonce: number,
): Promise<boolean> {
  const nonceBig = BigInt(nonce);
  const schnorrKeyIndexBig = BigInt(schnorrKeyIndex);
  const guardianIndexBig = BigInt(guardianIndex);

  validateOrFail(uint32Schema, schnorrKeyIndexBig, `schnorrKeyIndex must be a valid uint32`);
  validateOrFail(uint8Schema, guardianIndexBig, `guardianIndex must be a valid uint8`);
  validateOrFail(uint32Schema, nonceBig, `nonce must be a valid uint32`);

  const entry = await readNonceBitmap(provider, verificationV2Address, schnorrKeyIndexBig, guardianIndexBig, nonceBig >> 8n);

  const bit = 1n << (nonceBig & 0xFFn);

  return (entry & bit) !== 0n;
}

function pickUnsetBit(n: bigint) {
  for (let i = 255n; i >= 0n; --i) {
    if (((1n << i) & n) === 0n) return i;
  }
}

function randomUint24(): bigint {
  return BigInt(crypto.randomInt(0, 0x100_0000));
}

export async function findUnusedNonce(
  provider: ethers.Provider,
  verificationV2Address: string,
  schnorrKeyIndex: number,
  guardianIndex: number,
) {
  const schnorrKeyIndexBig = BigInt(schnorrKeyIndex);
  const guardianIndexBig = BigInt(guardianIndex);

  validateOrFail(uint32Schema, schnorrKeyIndexBig, `schnorrKeyIndex must be a valid uint32`);
  validateOrFail(uint8Schema, guardianIndexBig, `guardianIndex must be a valid uint8`);

  let nonceSlotOffset;
  while (true) {
    nonceSlotOffset = randomUint24();
    const entry = await readNonceBitmap(provider, verificationV2Address, schnorrKeyIndexBig, guardianIndexBig, nonceSlotOffset);

    const bit = pickUnsetBit(entry);

    if (bit !== undefined) return Number((nonceSlotOffset << 8n) | (1n << bit));
  }
}