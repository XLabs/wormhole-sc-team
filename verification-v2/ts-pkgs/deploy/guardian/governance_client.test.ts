import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ethers } from 'ethers';
import fs from 'fs';
import { 
  encodeSetShardId, 
  encodeAppendSchnorrKey, 
  encodePullMultisigKeyData, 
  encodeUpdate 
} from './governance_client.js';
import { parseGuardianKey } from '@xlabs-xyz/peer-lib';
import { Keypair, PublicKey } from '@solana/web3.js';

// Mock dependencies
vi.mock('fs');
vi.mock('@xlabs-xyz/peer-lib', () => ({
  parseGuardianKey: vi.fn(),
  errorMsg: (e: unknown) => String(e),
  errorStack: (e: unknown) => String(e),
}));

describe('Encoding Functions', () => {
  describe('encodeSetShardId', () => {
    it('should encode set-shard-id command correctly', () => {
      const guardianMessage = Buffer.from([0x01, 0x02, 0x03, 0x04]);
      const result = encodeSetShardId(guardianMessage);
      
      // Should start with opcode 0x00
      expect(result).toBeTruthy();
      expect(result.length).toBeGreaterThan(0);
      
      // Verify it's a valid hex string
      expect(result.startsWith('0x')).toBe(true);
      
      // Decode and verify structure: opcode (1 byte) + data
      const decoded = ethers.getBytes(result);
      expect(decoded[0]).toBe(0); // UPDATE_SET_SHARD_ID
      expect(decoded.slice(1)).toEqual(new Uint8Array(guardianMessage));
    });

    it('should handle empty guardian message', () => {
      const guardianMessage = Buffer.alloc(0);
      const result = encodeSetShardId(guardianMessage);
      
      expect(result).toBeTruthy();
      expect(result.startsWith('0x')).toBe(true);
      
      const decoded = ethers.getBytes(result);
      expect(decoded[0]).toBe(0); // UPDATE_SET_SHARD_ID
      expect(decoded.length).toBe(1); // Only opcode
    });
  });

  describe('encodeAppendSchnorrKey', () => {
    it('should encode append-schnorr_key command correctly', () => {
      const vaa = Buffer.from([0x10, 0x20, 0x30, 0x40, 0x50]);
      const result = encodeAppendSchnorrKey(vaa);
      
      expect(result).toBeTruthy();
      expect(result.startsWith('0x')).toBe(true);
      
      // Decode and verify: opcode (1 byte) + length (2 bytes, big-endian) + data
      const decoded = ethers.getBytes(result);
      expect(decoded[0]).toBe(1); // UPDATE_APPEND_SCHNORR_KEY
      // Length is encoded as uint16 big-endian: 5 = 0x0005
      expect(decoded[1]).toBe(0); // Length high byte
      expect(decoded[2]).toBe(5); // Length low byte
      expect(decoded.slice(3)).toEqual(new Uint8Array(vaa));
    });

    it('should handle large VAA data', () => {
      const vaa = Buffer.alloc(1000, 0x42);
      const result = encodeAppendSchnorrKey(vaa);
      
      expect(result).toBeTruthy();
      const decoded = ethers.getBytes(result);
      expect(decoded[0]).toBe(1); // UPDATE_APPEND_SCHNORR_KEY
      // Length should be 1000 = 0x03E8 (big-endian)
      expect(decoded[1]).toBe(0x03); // High byte
      expect(decoded[2]).toBe(0xE8); // Low byte
    });
  });

  describe('encodePullMultisigKeyData', () => {
    it('should encode pull-multisigs command correctly', () => {
      const limit = 42;
      const result = encodePullMultisigKeyData(limit);
      
      expect(result).toBeTruthy();
      expect(result.startsWith('0x')).toBe(true);
      
      // Decode and verify: opcode (1 byte) + limit (4 bytes, big-endian)
      const decoded = ethers.getBytes(result);
      expect(decoded[0]).toBe(2); // UPDATE_PULL_MULTISIG_KEY_DATA
      // Limit should be 42 = 0x0000002A (big-endian)
      expect(decoded[1]).toBe(0x00);
      expect(decoded[2]).toBe(0x00);
      expect(decoded[3]).toBe(0x00);
      expect(decoded[4]).toBe(0x2A);
    });

    it('should handle zero limit', () => {
      const limit = 0;
      const result = encodePullMultisigKeyData(limit);
      
      const decoded = ethers.getBytes(result);
      expect(decoded[0]).toBe(2); // UPDATE_PULL_MULTISIG_KEY_DATA
      expect(decoded.slice(1, 5)).toEqual(new Uint8Array([0, 0, 0, 0]));
    });

    it('should handle large limit values', () => {
      const limit = 0xFFFFFFFF; // Max uint32
      const result = encodePullMultisigKeyData(limit);
      
      const decoded = ethers.getBytes(result);
      expect(decoded[0]).toBe(2);
      expect(decoded.slice(1, 5)).toEqual(new Uint8Array([0xFF, 0xFF, 0xFF, 0xFF]));
    });
  });

  describe('encodeUpdate', () => {
    it('should encode set-shard-id command', () => {
      const args = {
        chain: 'evm' as const,
        contractAddress: '0x1234567890123456789012345678901234567890',
        rpcUrl: 'https://test.rpc',
        signer: {type: "keyfile", path:"test.key"} as const,
        pullLimit: 0,
        command: 'set-shard-id' as const,
        guardianMessage: 'test.msg',
      };
      const dataBytes = Buffer.from([0x01, 0x02, 0x03]);
      
      const result = encodeUpdate(args, dataBytes);
      
      expect(result).toBeTruthy();
      expect(result.startsWith('0x')).toBe(true);
      
      // Should match encodeSetShardId output
      const expected = encodeSetShardId(dataBytes);
      expect(result).toBe(expected);
    });

    it('should encode append-schnorr command with pull-multisigs', () => {
      const args = {
        chain: 'evm' as const,
        contractAddress: '0x1234567890123456789012345678901234567890',
        rpcUrl: 'https://test.rpc',
        signer: {type: "keyfile", path:"test.key"} as const,
        pullLimit: 10,
        command: 'append-schnorr' as const,
        vaa: 'test.vaa',
      };
      const dataBytes = Buffer.from([0x10, 0x20, 0x30]);
      
      const result = encodeUpdate(args, dataBytes);
      
      expect(result).toBeTruthy();
      expect(result.startsWith('0x')).toBe(true);
      
      // Should be concatenation of pull-multisigs + append-schnorr
      const pullData = encodePullMultisigKeyData(args.pullLimit);
      const appendData = encodeAppendSchnorrKey(dataBytes);
      const expected = ethers.solidityPacked(['bytes', 'bytes'], [pullData, appendData]);
      expect(result).toBe(expected);
    });

    it('should encode pull-multisigs command', () => {
      const args = {
        chain: 'evm' as const,
        contractAddress: '0x1234567890123456789012345678901234567890',
        rpcUrl: 'https://test.rpc',
        signer: {type: "keyfile", path:"test.key"} as const,
        pullLimit: 5,
        command: 'pull-multisigs' as const,
      };
      const dataBytes = Buffer.alloc(0);
      
      const result = encodeUpdate(args, dataBytes);
      
      expect(result).toBeTruthy();
      
      // Should match encodePullMultisigKeyData output
      const expected = encodePullMultisigKeyData(args.pullLimit);
      expect(result).toBe(expected);
    });
  });
});

describe('File-based Signing', () => {
  const mockPrivateKey = '0x' + '1'.repeat(64); // 32 bytes
  const mockKeyBytes = Buffer.from('1'.repeat(32), 'hex');
  const mockGuardianKeyFile = '-----BEGIN WORMHOLE GUARDIAN PRIVATE KEY-----\n...\n-----END WORMHOLE GUARDIAN PRIVATE KEY-----';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('EVM Key Parsing', () => {
    it('should parse guardian key file correctly', () => {
      vi.mocked(fs.readFileSync).mockReturnValue(mockGuardianKeyFile);
      vi.mocked(parseGuardianKey).mockReturnValue(mockKeyBytes);

      const fileContent = fs.readFileSync('test.key', 'utf-8');
      const keyBytes = parseGuardianKey(fileContent);
      const signerKey = `0x${Buffer.from(keyBytes).toString('hex')}`;

      expect(fs.readFileSync).toHaveBeenCalledWith('test.key', 'utf-8');
      expect(parseGuardianKey).toHaveBeenCalledWith(mockGuardianKeyFile);
      expect(signerKey).toBe(`0x${mockKeyBytes.toString('hex')}`);
    });

    it('should create valid ethers wallet from parsed key', () => {
      const wallet = new ethers.Wallet(mockPrivateKey);
      
      expect(wallet.address).toBeTruthy();
      expect(wallet.address.length).toBe(42); // 0x + 40 hex chars
      expect(wallet.address.startsWith('0x')).toBe(true);
    });

    it('should validate contract addresses', () => {
      const validAddress = '0x1234567890123456789012345678901234567890';
      const invalidAddress = '0xinvalid';

      expect(ethers.isAddress(validAddress)).toBe(true);
      expect(ethers.isAddress(invalidAddress)).toBe(false);
    });
  });

  describe('EVM Transaction Execution (Mocked)', () => {
    it('should create provider and wallet correctly', () => {
      const rpcUrl = 'https://test.rpc';
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const wallet = new ethers.Wallet(mockPrivateKey, provider);

      expect(wallet.address).toBeTruthy();
      expect(wallet.provider).toBe(provider);
    });

    it('should encode update data correctly for contract call', () => {
      const args = {
        chain: 'evm' as const,
        contractAddress: '0x1234567890123456789012345678901234567890',
        rpcUrl: 'https://test.rpc',
        signer: {type: "keyfile", path:"test.key"} as const,
        pullLimit: 0,
        command: 'set-shard-id' as const,
        guardianMessage: 'test.msg',
      };
      const dataBytes = Buffer.from([0x01, 0x02, 0x03]);
      
      const updateData = encodeUpdate(args, dataBytes);
      
      expect(updateData).toBeTruthy();
      expect(updateData.startsWith('0x')).toBe(true);
    });
  });

  describe('Solana PDA Derivation', () => {
    it('should parse GPG armor key file and create keypair from 32-byte seed', () => {
      // Generate a valid keypair for testing
      const validKeypair = Keypair.generate();
      const seed = validKeypair.secretKey.slice(0, 32); // First 32 bytes are the seed
      
      // Create a mock GPG armor file (simplified - just the key bytes encoded)
      // In reality, parseGuardianKey would parse the full GPG armor format
      const mockGpgArmor = `-----BEGIN WORMHOLE GUARDIAN PRIVATE KEY-----
      
${Buffer.from(seed).toString('base64')}
-----END WORMHOLE GUARDIAN PRIVATE KEY-----`;
      
      vi.mocked(fs.readFileSync).mockReturnValue(mockGpgArmor);
      vi.mocked(parseGuardianKey).mockReturnValue(seed);

      const signerFile = fs.readFileSync('test.key', 'utf-8');
      const keyBytes = parseGuardianKey(signerFile);
      const keypair = Keypair.fromSeed(keyBytes);

      expect(fs.readFileSync).toHaveBeenCalledWith('test.key', 'utf-8');
      expect(keypair.publicKey).toBeInstanceOf(PublicKey);
      expect(keypair.secretKey.length).toBe(64);
      // The public key should match when derived from the same seed
      expect(keypair.publicKey.toBase58()).toBe(validKeypair.publicKey.toBase58());
    });

    it('should parse GPG armor key file and create keypair from 64-byte keypair', () => {
      // Generate a valid keypair for testing
      const validKeypair = Keypair.generate();
      const fullKeypair = validKeypair.secretKey; // 64 bytes
      
      // Create a mock GPG armor file
      const mockGpgArmor = `-----BEGIN WORMHOLE GUARDIAN PRIVATE KEY-----
      
${Buffer.from(fullKeypair).toString('base64')}
-----END WORMHOLE GUARDIAN PRIVATE KEY-----`;
      
      vi.mocked(fs.readFileSync).mockReturnValue(mockGpgArmor);
      vi.mocked(parseGuardianKey).mockReturnValue(fullKeypair);

      const signerFile = fs.readFileSync('test.key', 'utf-8');
      const keyBytes = parseGuardianKey(signerFile);
      const keypair = Keypair.fromSecretKey(keyBytes);

      expect(fs.readFileSync).toHaveBeenCalledWith('test.key', 'utf-8');
      expect(keypair.publicKey).toBeInstanceOf(PublicKey);
      expect(keypair.secretKey.length).toBe(64);
      expect(keypair.publicKey.toBase58()).toBe(validKeypair.publicKey.toBase58());
    });

    it('should derive PDAs correctly', () => {
      const programId = new PublicKey('GbFfTqMqKDgAMRH8VmDmoLTdvDd1853TnkkEwpydv3J6');
      
      // Test schnorr key PDA derivation
      const schnorrKeyIndex = 5;
      const schnorrKeyIndexBuf = Buffer.alloc(4);
      schnorrKeyIndexBuf.writeUint32LE(schnorrKeyIndex);
      const seeds = [Buffer.from('schnorrkey'), schnorrKeyIndexBuf];
      const [pda] = PublicKey.findProgramAddressSync(seeds, programId);
      
      expect(pda).toBeInstanceOf(PublicKey);
      expect(pda.toBase58().length).toBeGreaterThan(0);

      // Test latest key PDA derivation
      const latestSeeds = [Buffer.from('latestkey')];
      const [latestPda] = PublicKey.findProgramAddressSync(latestSeeds, programId);
      
      expect(latestPda).toBeInstanceOf(PublicKey);
      expect(latestPda.toBase58().length).toBeGreaterThan(0);
    });
  });
});

describe('Integration: Encoding and Validation', () => {
  it('should produce consistent encoding results', () => {
    const testData = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05]);
    
    // Encode multiple times - should be consistent
    const result1 = encodeSetShardId(testData);
    const result2 = encodeSetShardId(testData);
    
    expect(result1).toBe(result2);
  });

  it('should handle different data sizes correctly', () => {
    const sizes = [0, 1, 10, 100, 1000];
    
    for (const size of sizes) {
      const data = Buffer.alloc(size, 0x42);
      const result = encodeAppendSchnorrKey(data);
      
      expect(result).toBeTruthy();
      const decoded = ethers.getBytes(result);
      // Length is encoded as uint16 big-endian
      const length = (decoded[1] << 8) | decoded[2];
      expect(length).toBe(size);
    }
  });

  it('should produce valid hex strings for all encoding functions', () => {
    const testData = Buffer.from([0x01, 0x02, 0x03]);
    
    const results = [
      encodeSetShardId(testData),
      encodeAppendSchnorrKey(testData),
      encodePullMultisigKeyData(10),
    ];
    
    for (const result of results) {
      expect(result.startsWith('0x')).toBe(true);
      expect(result.length % 2).toBe(0); // Even length (hex pairs)
      // Should be valid hex
      expect(() => ethers.getBytes(result)).not.toThrow();
    }
  });
});
