import { ethers } from 'ethers';
import {
  hashPeerData,
  PeerClientConfig,
  PeersResponse,
  validateOrFail,
  PeersResponseSchema,
  UploadResponseSchema,
  UploadResponse,
  errorStack,
  createSigner,
  validateSomePeers,
  WormholeGuardianData,
  Peer,
  UncheckedPeer,
  UncheckedPeersResponse,
  UncheckedPeerSchema,
  UncheckedPeersResponseSchema
} from '@xlabs-xyz/peer-lib';

export class PeerClient {
  private config: PeerClientConfig;
  private serverUrl: string;

  constructor(config: PeerClientConfig, private readonly pollPeriod = 5000) {
    this.config = config;
    this.serverUrl = this.config.serverUrl;
  }

  private async signPeerData(): Promise<UncheckedPeer> {
    const signer = await createSigner(this.config);

    const { peer } = this.config;
    const messageHash = hashPeerData(peer);
    const signature = await signer.signMessage(ethers.getBytes(messageHash));

    const peerRegistration = {
      ...peer,
      signature,
    };
    return validateOrFail(UncheckedPeerSchema, peerRegistration, "Generated peer registration is invalid");
  }

  private async uploadPeerData(peerRegistration: UncheckedPeer): Promise<UploadResponse> {
    console.log(`[UPLOAD] Uploading peer data for guardian...`);

    const response = await fetch(`${this.serverUrl}/peers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(peerRegistration),
    });

    if (response.ok) {
      const result = validateOrFail(UploadResponseSchema, await response.json(), "Invalid server response");
      console.log(`[SUCCESS] Successfully uploaded peer data!`);
      console.log(`   Guardian Address: ${result.peer.guardianAddress}`);
      console.log(`   Guardian Index: ${result.peer.guardianIndex}`);
      console.log(`   Hostname: ${result.peer.hostname}`);
      return result;
    } else {
      const error = await response.text();
      console.error(`[ERROR] Failed to upload peer data: ${response.status} ${response.statusText}`);
      console.error(`   Error: ${error}`);
      throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
    }
  }

  private async signAndUploadPeerData(): Promise<UploadResponse> {
    const peerRegistration = await this.signPeerData();
    return this.uploadPeerData(peerRegistration);
  }

  private async pollForCompletion(totalExpectedGuardians: number, threshold: number): Promise<UncheckedPeersResponse> {
    console.log(`[POLLING] Starting to poll for completion...`);

    let lastPeerCount = 0;

    for (;;) {
      try {
        const uncheckedResponse = await fetch(`${this.serverUrl}/peers`);

        if (uncheckedResponse.ok) {
          const uncheckedJsonResponse = await uncheckedResponse.json() as unknown;

          const { peers, threshold: serverThreshold } = validateOrFail(
            UncheckedPeersResponseSchema, uncheckedJsonResponse, "Invalid peers response"
          );

          if (peers.length > totalExpectedGuardians) {
            throw new Error(`More guardians than expected have submitted their peer data`);
          }
          if (serverThreshold !== threshold) {
            throw new Error(`Server informed that the threshold expected for this ceremony is ${serverThreshold} but this client configured ${threshold}`);
          }

          // Check if all expected guardians have submitted
          if (peers.length === totalExpectedGuardians) {
            console.log(`[SUCCESS] All ${totalExpectedGuardians} expected guardians have submitted their peer data!`);
            return { peers, threshold, totalExpectedGuardians };
          }

          // Show progress if we have new submissions
          const progressMessage = `${peers.length}/${totalExpectedGuardians} guardians have submitted`;
          if (peers.length > lastPeerCount) {
            console.log(`[PROGRESS] ${progressMessage}`);
            lastPeerCount = peers.length;
          } else {
            console.log(`[PROGRESS] ${progressMessage} (waiting for more...)`);
          }
        } else {
          console.error(`[ERROR] Failed to fetch peers: ${uncheckedResponse.status} ${uncheckedResponse.statusText}`);
        }
      } catch (error) {
        console.error(`[ERROR] Error polling for completion: ${errorStack(error)}`);
      }

      // Wait before next poll
      await this.sleep(this.pollPeriod);
    }
  }

  private validatePeers(uncheckedPeers: UncheckedPeer[], wormholeData: WormholeGuardianData): Peer[] {
    // We need to ensure that we're providing the full set of peers here to do a full validation in `validateSomePeers`.
    if (uncheckedPeers.length !== wormholeData.guardians.length) {
      throw new Error(`Expected ${wormholeData.guardians.length} guardians, got ${uncheckedPeers.length}`);
    }

    const peers = validateSomePeers(uncheckedPeers, wormholeData);
    // This should never be hit due to validateSomePeers implementation but checking can't hurt
    if (peers.some((peer) => peer === undefined))
      throw new Error(`Some peers are missing.`);
    // We cast because we know there is no undefined element.
    return peers as Peer[];
  }

  private async pollAllPeersAndValidate(wormholeData: WormholeGuardianData, threshold: number): Promise<PeersResponse> {
    const uncheckedResponse = await this.pollForCompletion(wormholeData.guardians.length, threshold);
    const checkedPeers = this.validatePeers(uncheckedResponse.peers, wormholeData);
    return {...uncheckedResponse, peers: checkedPeers};
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async run<T>(action: () => Promise<T>, message: string): Promise<T> {
    console.log(`[STARTING] Peer Client starting...`);
    console.log(`   Server: ${this.serverUrl}`);
    console.log(`   Peer: ${this.config.peer.hostname}`);
    console.log(`   ${message}`);
    const result = await action();
    console.log(`[COMPLETED] Completed successfully!`);
    return result;
  }

  public async submitPeerData(): Promise<UploadResponse> {
    if (this.config.guardianKey === undefined) {
      throw new Error(`Guardian key was not set`);
    }
    return this.run(() => this.signAndUploadPeerData(), "Uploading peer data...");
  }

  public async waitForAllPeers(wormholeData: WormholeGuardianData, threshold: number): Promise<PeersResponse> {
    return this.run(() => this.pollAllPeersAndValidate(wormholeData, threshold), "Polling all peers...");
  }

  public async submitAndWaitForAllPeers(wormholeData: WormholeGuardianData, threshold: number): Promise<PeersResponse> {
    await this.submitPeerData();
    return this.waitForAllPeers(wormholeData, threshold);
  }

  // Test helper method to get current peer data from server
  public async getCurrentPeers(): Promise<PeersResponse> {
    const response = await fetch(`${this.serverUrl}/peers`);
    if (!response.ok) {
      throw new Error(`Failed to fetch peers: ${response.status} ${response.statusText}`);
    }
    return validateOrFail(PeersResponseSchema, await response.json(), "Invalid peers response");
  }
}
