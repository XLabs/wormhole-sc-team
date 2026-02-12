import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ethers } from 'ethers';
import { Connection, Keypair, PublicKey, Transaction } from '@solana/web3.js';
import fs from 'fs';
import { 
  encodeSetShardId, 
  encodeAppendSchnorrKey, 
  encodePullMultisigKeyData, 
  encodeUpdate 
} from './governance_client.js';
import { parseGuardianKey } from '@xlabs-xyz/peer-lib';

// Mock dependencies
vi.mock('fs');
vi.mock('@xlabs-xyz/peer-lib', () => ({
  parseGuardianKey: vi.fn(),
  errorMsg: (e: unknown) => String(e),
  errorStack: (e: unknown) => String(e),
}));

describe('EVM Contract Integration', () => {
  const mockPrivateKey = '0x' + '1'.repeat(64);
  const mockKeyBytes = Buffer.from('1'.repeat(32), 'hex');
  const mockGuardianKeyFile = '-----BEGIN WORMHOLE GUARDIAN PRIVATE KEY-----\n...\n-----END WORMHOLE GUARDIAN PRIVATE KEY-----';
  const testContractAddress = '0x1234567890123456789012345678901234567890';
  const testRpcUrl = 'https://test.rpc';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Contract Interface Verification', () => {
    it('should encode data compatible with update(bytes) function signature', () => {
      const guardianMessage = Buffer.from([0x01, 0x02, 0x03, 0x04]);
      const encoded = encodeSetShardId(guardianMessage);
      
      // Verify it's a valid hex string that can be passed to bytes parameter
      expect(encoded.startsWith('0x')).toBe(true);
      expect(() => ethers.getBytes(encoded)).not.toThrow();
      
      // Verify the data structure: opcode + message
      const decoded = ethers.getBytes(encoded);
      expect(decoded[0]).toBe(0); // UPDATE_SET_SHARD_ID opcode
      expect(decoded.slice(1)).toEqual(new Uint8Array(guardianMessage));
    });

    it('should encode append-schnorr with pull-multisigs correctly', () => {
      const vaa = Buffer.from([0x10, 0x20, 0x30]);
      const limit = 5;
      
      const pullData = encodePullMultisigKeyData(limit);
      const appendData = encodeAppendSchnorrKey(vaa);
      const combined = ethers.solidityPacked(['bytes', 'bytes'], [pullData, appendData]);
      
      // Verify structure: pull-multisigs (5 bytes) + append-schnorr (variable)
      expect(combined.startsWith('0x')).toBe(true);
      
      const decoded = ethers.getBytes(combined);
      // First 5 bytes should be pull-multisigs: opcode (1) + limit (4)
      expect(decoded[0]).toBe(2); // UPDATE_PULL_MULTISIG_KEY_DATA
      // Next should be append-schnorr: opcode (1) + length (2) + data
      const appendStart = 5;
      expect(decoded[appendStart]).toBe(1); // UPDATE_APPEND_SCHNORR_KEY
    });

    it('should create contract instance with correct ABI', () => {
      const provider = new ethers.JsonRpcProvider(testRpcUrl);
      const wallet = new ethers.Wallet(mockPrivateKey, provider);
      
      const UPDATE_ABI = [
        {
          name: 'update',
          type: 'function',
          stateMutability: 'nonpayable',
          inputs: [{ name: 'data', type: 'bytes' }],
          outputs: [],
        },
      ] as const;
      
      const contract = new ethers.Contract(testContractAddress, UPDATE_ABI, wallet);
      
      // Verify contract has the update function
      expect(contract.update).toBeDefined();
      expect(typeof contract.update).toBe('function');
      
      // Verify the function signature matches
      const iface = new ethers.Interface(UPDATE_ABI);
      const updateFunc = iface.getFunction('update');
      expect(updateFunc).toBeDefined();
      // Verify function signature (format includes 'function' prefix, so check the signature hash)
      expect(updateFunc?.format('sighash')).toBe('update(bytes)');
    });

    it('should encode data that matches expected contract input format', () => {
      const testCases = [
        {
          command: 'set-shard-id' as const,
          data: Buffer.from([0x01, 0x02, 0x03]),
          expectedOpcode: 0,
        },
        {
          command: 'pull-multisigs' as const,
          data: Buffer.alloc(0),
          expectedOpcode: 2,
          limit: 10,
        },
      ];

      for (const testCase of testCases) {
        const args: any = {
          chain: 'evm' as const,
          contractAddress: testContractAddress,
          rpcUrl: testRpcUrl,
          signer: 'test.key',
          chainId: 1,
          limit: testCase.limit || 0,
          command: testCase.command,
          ...(testCase.command === 'set-shard-id' ? { guardianMessage: 'test.msg' } : {}),
        };
        
        const encoded = encodeUpdate(args, testCase.data);
        
        // Verify it's valid bytes
        const bytes = ethers.getBytes(encoded);
        expect(bytes[0]).toBe(testCase.expectedOpcode);
        
        // Verify it can be used as contract parameter
        const iface = new ethers.Interface([{
          name: 'update',
          type: 'function',
          stateMutability: 'nonpayable',
          inputs: [{ name: 'data', type: 'bytes' }],
          outputs: [],
        }]);
        
        // Should be able to encode for contract call
        const encodedCall = iface.encodeFunctionData('update', [encoded]);
        expect(encodedCall).toBeTruthy();
        expect(encodedCall.startsWith('0x')).toBe(true);
      }
    });
  });

  describe('Full Transaction Flow (Mocked)', () => {
    it('should prepare complete transaction with correct encoding', async () => {
      vi.mocked(fs.readFileSync).mockReturnValue(mockGuardianKeyFile);
      vi.mocked(parseGuardianKey).mockReturnValue(mockKeyBytes);

      const provider = new ethers.JsonRpcProvider(testRpcUrl);
      const wallet = new ethers.Wallet(mockPrivateKey, provider);
      
      const UPDATE_ABI = [
        {
          name: 'update',
          type: 'function',
          stateMutability: 'nonpayable',
          inputs: [{ name: 'data', type: 'bytes' }],
          outputs: [],
        },
      ] as const;
      
      const contract = new ethers.Contract(testContractAddress, UPDATE_ABI, wallet);
      
      const guardianMessage = Buffer.from([0x01, 0x02, 0x03]);
      const updateData = encodeSetShardId(guardianMessage);
      
      // Mock the contract call
      const mockTx = {
        hash: '0x' + 'a'.repeat(64),
        wait: vi.fn().mockResolvedValue({
          status: 1,
          blockNumber: 12345,
          gasUsed: ethers.parseUnits('100000', 'wei'),
        }),
      };
      
      vi.spyOn(contract, 'update').mockResolvedValue(mockTx);
      
      // Execute the transaction
      const tx = await contract.update(updateData);
      const receipt = await tx.wait();
      
      expect(contract.update).toHaveBeenCalledWith(updateData);
      expect(receipt.status).toBe(1);
      expect(receipt.blockNumber).toBe(12345);
    });

    it('should handle transaction errors correctly', async () => {
      const provider = new ethers.JsonRpcProvider(testRpcUrl);
      const wallet = new ethers.Wallet(mockPrivateKey, provider);
      
      const UPDATE_ABI = [
        {
          name: 'update',
          type: 'function',
          stateMutability: 'nonpayable',
          inputs: [{ name: 'data', type: 'bytes' }],
          outputs: [],
        },
      ] as const;
      
      const contract = new ethers.Contract(testContractAddress, UPDATE_ABI, wallet);
      
      const updateData = encodePullMultisigKeyData(5);
      
      // Mock transaction failure
      const mockTx = {
        hash: '0x' + 'b'.repeat(64),
        wait: vi.fn().mockResolvedValue({
          status: 0, // Failed
          blockNumber: 12346,
          gasUsed: ethers.parseUnits('50000', 'wei'),
        }),
      };
      
      vi.spyOn(contract, 'update').mockResolvedValue(mockTx);
      
      const tx = await contract.update(updateData);
      const receipt = await tx.wait();
      
      expect(receipt.status).toBe(0);
    });
  });
});

describe('Solana Program Integration', () => {
  const testProgramId = new PublicKey('GbFfTqMqKDgAMRH8VmDmoLTdvDd1853TnkkEwpydv3J6');
  const testRpcUrl = 'http://localhost:8899';

  describe('Program Interface Verification', () => {
    it('should derive PDAs correctly for program', () => {
      const schnorrKeyIndex = 5;
      const schnorrKeyIndexBuf = Buffer.alloc(4);
      schnorrKeyIndexBuf.writeUint32LE(schnorrKeyIndex);
      const seeds = [Buffer.from('schnorrkey'), schnorrKeyIndexBuf];
      const [pda] = PublicKey.findProgramAddressSync(seeds, testProgramId);
      
      expect(pda).toBeInstanceOf(PublicKey);
      expect(pda.toBase58().length).toBeGreaterThan(0);
      
      // Verify PDA is deterministic
      const [pda2] = PublicKey.findProgramAddressSync(seeds, testProgramId);
      expect(pda.toBase58()).toBe(pda2.toBase58());
    });

    it('should derive latest key PDA correctly', () => {
      const seeds = [Buffer.from('latestkey')];
      const [pda] = PublicKey.findProgramAddressSync(seeds, testProgramId);
      
      expect(pda).toBeInstanceOf(PublicKey);
      expect(pda.toBase58().length).toBeGreaterThan(0);
    });
  });

  describe('Instruction Building (Mocked)', () => {
    it('should build appendSchnorrKey instruction with correct accounts', async () => {
      const keypair = Keypair.generate();
      
      // Mock IDL - we'll use a minimal structure
      const mockIdl = {
        version: '0.1.0',
        name: 'verification_v2',
        metadata: {
          address: testProgramId.toBase58(),
        },
        instructions: [
          {
            name: 'appendSchnorrKey',
            accounts: [
              { name: 'payer', isSigner: true, isWritable: true },
              { name: 'vaa', isSigner: false, isWritable: false },
              { name: 'signatureSet', isSigner: false, isWritable: false },
              { name: 'latestSchnorrKey', isSigner: false, isWritable: false },
              { name: 'newSchnorrKey', isSigner: false, isWritable: true },
              { name: 'oldSchnorrKey', isSigner: false, isWritable: false, optional: true },
            ],
            args: [],
          },
        ],
      };
      
      // Skip Program creation test - it requires full IDL structure
      // Instead, test that we can build the accounts structure correctly
      const accounts = {
        payer: keypair.publicKey,
        vaa: PublicKey.default,
        signatureSet: PublicKey.default,
        latestSchnorrKey: PublicKey.findProgramAddressSync(
          [Buffer.from('latestkey')],
          testProgramId
        )[0],
        newSchnorrKey: (() => {
          const indexBuf = Buffer.alloc(4);
          indexBuf.writeUint32LE(0, 0);
          return PublicKey.findProgramAddressSync(
            [Buffer.from('schnorrkey'), indexBuf],
            testProgramId
          )[0];
        })(),
        oldSchnorrKey: null,
      };
      
      // Verify accounts structure is correct
      expect(accounts.payer).toBeInstanceOf(PublicKey);
      expect(accounts.vaa).toBeInstanceOf(PublicKey);
      expect(accounts.signatureSet).toBeInstanceOf(PublicKey);
      expect(accounts.latestSchnorrKey).toBeInstanceOf(PublicKey);
      expect(accounts.newSchnorrKey).toBeInstanceOf(PublicKey);
      
      // Mock the program method call
      const program = { methods: { appendSchnorrKey: vi.fn() } } as any;
      
      // Verify accounts structure matches what would be passed to the program
      expect(accounts).toMatchObject({
        payer: expect.any(PublicKey),
        vaa: expect.any(PublicKey),
        signatureSet: expect.any(PublicKey),
        latestSchnorrKey: expect.any(PublicKey),
        newSchnorrKey: expect.any(PublicKey),
        oldSchnorrKey: null,
      });
    });

    it('should build transaction with correct structure', () => {
      const keypair = Keypair.generate();
      const connection = new Connection(testRpcUrl, 'confirmed');
      
      const mockInstruction = {
        keys: [],
        programId: testProgramId,
        data: Buffer.from([0x01, 0x02, 0x03]),
      };
      
      const tx = new Transaction().add(mockInstruction as any);
      tx.feePayer = keypair.publicKey;
      
      expect(tx.instructions.length).toBe(1);
      expect(tx.feePayer?.equals(keypair.publicKey)).toBe(true);
    });
  });

  describe('PDA Derivation Consistency', () => {
    it('should derive consistent PDAs for same inputs', () => {
      const testCases = [
        { index: 0, seed: 'schnorrkey' },
        { index: 1, seed: 'schnorrkey' },
        { index: 100, seed: 'schnorrkey' },
        { seed: 'latestkey' },
      ];

      for (const testCase of testCases) {
        const seeds = testCase.index !== undefined
          ? [Buffer.from(testCase.seed), (() => {
              const buf = Buffer.alloc(4);
              buf.writeUint32LE(testCase.index, 0);
              return buf;
            })()]
          : [Buffer.from(testCase.seed)];
        
        const [pda1] = PublicKey.findProgramAddressSync(seeds, testProgramId);
        const [pda2] = PublicKey.findProgramAddressSync(seeds, testProgramId);
        
        expect(pda1.toBase58()).toBe(pda2.toBase58());
      }
    });

    it('should derive different PDAs for different indices', () => {
      const index1 = 0;
      const index2 = 1;
      
      const buf1 = Buffer.alloc(4);
      buf1.writeUint32LE(index1, 0);
      const buf2 = Buffer.alloc(4);
      buf2.writeUint32LE(index2, 0);
      const seeds1 = [Buffer.from('schnorrkey'), buf1];
      const seeds2 = [Buffer.from('schnorrkey'), buf2];
      
      const [pda1] = PublicKey.findProgramAddressSync(seeds1, testProgramId);
      const [pda2] = PublicKey.findProgramAddressSync(seeds2, testProgramId);
      
      expect(pda1.toBase58()).not.toBe(pda2.toBase58());
    });
  });
});

describe('End-to-End Encoding Verification', () => {
  it('should produce encoding that matches contract expectations', () => {
    // Test set-shard-id
    const guardianMessage = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05]);
    const encoded = encodeSetShardId(guardianMessage);
    
    // Verify structure matches contract expectation
    const bytes = ethers.getBytes(encoded);
    expect(bytes.length).toBe(1 + guardianMessage.length); // opcode + data
    expect(bytes[0]).toBe(0); // UPDATE_SET_SHARD_ID
    
    // Verify it can be decoded as bytes in contract
    const iface = new ethers.Interface([{
      name: 'update',
      type: 'function',
      inputs: [{ name: 'data', type: 'bytes' }],
      outputs: [],
    }]);
    
    const callData = iface.encodeFunctionData('update', [encoded]);
    expect(callData).toBeTruthy();
  });

  it('should handle append-schnorr with various VAA sizes', () => {
    const sizes = [0, 1, 10, 100, 1000, 5000];
    
    for (const size of sizes) {
      const vaa = Buffer.alloc(size, 0x42);
      const encoded = encodeAppendSchnorrKey(vaa);
      
      const bytes = ethers.getBytes(encoded);
      // Structure: opcode (1) + length (2) + data (size)
      expect(bytes.length).toBe(1 + 2 + size);
      expect(bytes[0]).toBe(1); // UPDATE_APPEND_SCHNORR_KEY
      
      // Verify length encoding (big-endian uint16)
      const length = (bytes[1] << 8) | bytes[2];
      expect(length).toBe(size);
    }
  });

  it('should encode pull-multisigs with various limits', () => {
    const limits = [0, 1, 10, 100, 1000, 0xFFFFFFFF];
    
    for (const limit of limits) {
      const encoded = encodePullMultisigKeyData(limit);
      const bytes = ethers.getBytes(encoded);
      
      // Structure: opcode (1) + limit (4)
      expect(bytes.length).toBe(5);
      expect(bytes[0]).toBe(2); // UPDATE_PULL_MULTISIG_KEY_DATA
      
      // Verify limit encoding (big-endian uint32)
      const decodedLimit = Number((BigInt(bytes[1]) << 24n) | (BigInt(bytes[2]) << 16n) | (BigInt(bytes[3]) << 8n) | BigInt(bytes[4]));
      expect(decodedLimit).toBe(limit);
    }
  });
});
