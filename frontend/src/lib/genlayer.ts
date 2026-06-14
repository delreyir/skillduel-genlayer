import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import type { GenLayerClient } from "genlayer-js/types";

export const CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ||
  "0xB95f58bcb95A7807FB462923c8aD23804C0C1608") as `0x${string}`;

// EIP-1193 provider (MetaMask, Rabby, etc.)
declare global {
  interface Window {
    ethereum?: any;
  }
}

export type WalletState = {
  address: `0x${string}` | null;
  client: GenLayerClient<any> | null;
};

// Detect any injected EVM wallet (MetaMask, Rabby, Coinbase, etc.)
export function hasWallet(): boolean {
  return typeof window !== "undefined" && !!window.ethereum;
}

// Request accounts from the injected wallet and build a GenLayer client
export async function connectWallet(): Promise<WalletState> {
  if (!hasWallet()) {
    throw new Error("No wallet found. Install MetaMask, Rabby, or another EVM wallet.");
  }

  const accounts: string[] = await window.ethereum.request({
    method: "eth_requestAccounts",
  });
  if (!accounts || accounts.length === 0) {
    throw new Error("No accounts authorized");
  }
  const address = accounts[0] as `0x${string}`;

  const client = createClient({
    chain: studionet,
    account: address,
  });

  // Switch the wallet to the GenLayer Studionet chain — required before writes
  await client.connect("studionet");

  return { address, client };
}

// A read-only client (no wallet) for fetching contract state
export function readClient(): GenLayerClient<any> {
  return createClient({ chain: studionet }) as GenLayerClient<any>;
}

export function shortAddr(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}
