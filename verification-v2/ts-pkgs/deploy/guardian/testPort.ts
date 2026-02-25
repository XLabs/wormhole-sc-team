import net from 'net';
import fs from 'fs';
import path from 'path';
import { errorStack, BasePeerArraySchema, BasePeerSchema, validateOrFail } from '@xlabs-xyz/peer-lib';

type PortState = 'open' | 'closed' | 'filtered' | 'error';

interface Peer {
  host: string;
  port: number;
}

interface CheckResult extends Peer {
  ip?: string;
  state: PortState;
  error?: unknown;
  rttNs?: bigint;
}

// Type for peer_config.json
interface PeerConfigPeer {
  hostname: string;
  port: number;
  tlsX509?: string;
}

interface PeerConfig {
  peers: PeerConfigPeer[];
  self?: PeerConfigPeer;
  numParticipants?: number;
  wantedThreshold?: number;
}

/** Check single host:port using a full TCP connect */
function checkTcp(
  host: string,
  port: number,
  timeoutMs: number
): Promise<CheckResult> {
  return new Promise<CheckResult>((resolve) => {
    const start = process.hrtime.bigint();
    const socket = new net.Socket();
    let finished = false;

    socket.once('connect', () => {
      if (finished) return;
      finished = true;

      const rttNs = process.hrtime.bigint() - start;
      const ip = socket.remoteAddress;
      resolve({ host, ip, port, state: 'open', rttNs });
      socket.end();
    });

    socket.once('error', (err: NodeJS.ErrnoException) => {
      if (finished) return;
      finished = true;

      const code = err.code;
      resolve({
        host,
        port,
        state: code === "ECONNREFUSED" || code === "ENETUNREACH" || code === "EHOSTUNREACH" || code === "EACCES"
          ? "closed"
          : "error",
        error: code ?? err.message
      });
      socket.destroy();
    });

    socket.setTimeout(timeoutMs, () => {
      if (finished) return;
      finished = true;

      resolve({ host, port, state: 'filtered', error: `timeout(${timeoutMs}ms)` });
      socket.destroy();
    });

    socket.connect({ host, port });
  });
}

async function scanList(
  targets: Peer[],
  concurrency = 100,
  timeoutMs = 3000
): Promise<CheckResult[]> {
  const results: CheckResult[] = [];
  let index = 0;
  const workers: Promise<void>[] = [];

  const worker = async () => {
    while (true) {
      const i = index++;
      if (i >= targets.length) return;

      const target = targets[i];
      try {
        const res = await checkTcp(target.host, target.port, timeoutMs);
        results.push(res);
      } catch (error) {
        results.push({
          host: target.host,
          ip: target.host,
          port: target.port,
          state: 'error',
          error: (error as Error | undefined)?.stack ?? error,
        });
      }
    }
  };

  for (let i = 0; i < Math.min(concurrency, targets.length); i++) {
    workers.push(worker());
  }
  await Promise.all(workers);
  return results;
}

/** Load peer configuration from peer_config.json */
function loadPeerConfig(configPath: string): Peer[] {
  try {
    const configData = fs.readFileSync(configPath, 'utf-8');
    const config = JSON.parse(configData) as PeerConfig;

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition, @typescript-eslint/strict-boolean-expressions
    if (!config.peers) {
      throw new Error('Invalid config: missing "Peers" array');
    }
    validateOrFail(BasePeerArraySchema, config.peers, 'Invalid config: invalid "Peers" array')

    const peers: Peer[] = config.peers.map((p: PeerConfigPeer) => ({
      host: p.hostname,
      port: p.port,
    }));

    // Optionally include Self peer if present
    if (config.self) {
      validateOrFail(BasePeerSchema, config.self, 'Invalid config: invalid "Self" peer')
      peers.push({
        host: config.self.hostname,
        port: config.self.port,
      });
    }

    return peers;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to load peer_config.json: ${error.message}`);
    }
    throw error;
  }
}

(async () => {
  const raw = process.argv.slice(2);
  let targets: Peer[];

  // Check if --config flag is used or if no arguments provided
  if (raw.length === 0 || (raw.length > 0 && raw[0] === '--config')) {
    const configPath = raw.length > 1 && raw[0] === '--config'
      ? path.resolve(raw[1])
      : path.resolve('peer_config.json');

    if (!fs.existsSync(configPath)) {
      console.error(`Error: ${configPath} not found`);
      console.log('\nUsage:');
      console.log('  testPort.ts                            # reads from ./peer_config.json');
      console.log('  testPort.ts --config <path>            # reads from specified config file');
      console.log('  testPort.ts host:port [host:port] ...  # test specific hosts');
      process.exit(1);
    }

    try {
      targets = loadPeerConfig(configPath);
      console.log(`Loaded ${targets.length} peers from ${configPath}`);
    } catch (error) {
      console.error((error as Error | undefined)?.message ?? error);
      process.exit(1);
    }
  } else {
    // Parse command-line arguments as host:port pairs
    targets = raw.map((s) => {
      const [h, p] = s.split(':');
      return { host: h, port: Number(p) };
    });
  }

  if (targets.length === 0) {
    console.error('Error: No peers to test');
    process.exit(1);
  }

  console.log(`Testing ${targets.length} peer(s)...\n`);
  const out = await scanList(targets);

  // Print results
  const openPeers = out.filter(r => r.state === 'open');
  const failedPeers = out.filter(r => r.state !== 'open');

  for (const r of out) {
    const statusSymbol = r.state === 'open' ? '✓' : '✗';
    const rttInfo = r.rttNs !== undefined ? ` (${(Number(r.rttNs) / 1_000_000).toFixed(2)}ms)` : '';
    const errorInfo = r.error !== undefined ? ` - ${errorStack(r.error)}` : '';
    console.log(`${statusSymbol} ${r.host}:${r.port} -> ${r.state}${rttInfo}${errorInfo}`);
  }

  console.log(`\nSummary: ${openPeers.length}/${out.length} peers reachable`);

  if (failedPeers.length > 0) {
    console.error(`\n⚠ Warning: ${failedPeers.length} peer(s) failed connection test`);
    process.exit(1);
  }
})().catch((error: unknown) => {
  console.error((error as Error | undefined)?.stack ?? error);
  process.exit(1);
});
