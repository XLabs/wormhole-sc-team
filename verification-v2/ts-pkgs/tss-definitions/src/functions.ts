import {
  deserializeLayout,
  encoding,
  serializeLayout,
} from "@wormhole-foundation/sdk-base";
import { v2Layout, VAAV2 } from "./layouts.js";
import { PublicKey } from "@solana/web3.js";

/**
 * serialize a VAAV2 to a Uint8Array
 * @param vaa the VAAV2 to serialize
 * @returns a Uint8Array representation of the VAAV2
 * @throws if the VAAV2 is not valid
 */
export function serialize(vaa: VAAV2): Uint8Array {
  return serializeLayout(v2Layout, vaa);
}

/**
 * deserialize a VAAV2 from a Uint8Array
 * @param data the data to deserialize
 * @returns a VAAV2 object
 * @throws if the data is not a valid VAAV2
 */

export function deserialize(rawData: Uint8Array | string): VAAV2{
  const data: Uint8Array = typeof rawData === "string" ? encoding.hex.decode(rawData) : rawData;
  const [result,] = deserializeLayout(v2Layout, data, false);
  return result satisfies VAAV2;
}

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