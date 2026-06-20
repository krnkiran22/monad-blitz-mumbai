"use client";

import { useState, useEffect, useCallback } from "react";
import { parseEventLogs } from "viem";
import {
  getPublicClient,
  getWalletClient,
  IDENTITY_REGISTRY_ADDRESS,
  REPUTATION_REGISTRY_ADDRESS,
  IDENTITY_REGISTRY_ABI,
  REPUTATION_REGISTRY_ABI,
  AGENTS_ONCHAIN,
} from "./config";

export interface AgentMeta {
  name: string;
  tagline?: string;
  color?: string;
  weapon?: string;
  image?: string;
}

export interface OnchainAgent extends AgentMeta {
  id: number;
  owner: string;
  matches: number;
  wins: number;
  kills: number;
  uri: string;
}

// Default NFT artwork — the in-game soldier face, served from /public.
export const DEFAULT_AGENT_IMAGE = "/agents/default.png";

// Self-contained metadata — no IPFS needed for the demo. The agent's profile
// lives in the ERC-721 tokenURI as a base64 data URI, so it's fully on-chain.
function toDataUri(meta: AgentMeta): string {
  const json = JSON.stringify({ standard: "ERC-8004", ...meta });
  const b64 =
    typeof window !== "undefined"
      ? window.btoa(unescape(encodeURIComponent(json)))
      : Buffer.from(json).toString("base64");
  return `data:application/json;base64,${b64}`;
}

function parseDataUri(uri: string): AgentMeta | null {
  try {
    if (uri.startsWith("data:application/json;base64,")) {
      const b64 = uri.slice("data:application/json;base64,".length);
      const json = decodeURIComponent(escape(window.atob(b64)));
      return JSON.parse(json);
    }
    if (uri.startsWith("data:application/json,")) {
      return JSON.parse(decodeURIComponent(uri.slice("data:application/json,".length)));
    }
  } catch {
    /* malformed or off-chain URI — fall through */
  }
  return null;
}

export function useAgentRegistry() {
  const [walletAddress, setWalletAddress] = useState("");
  const [agents, setAgents] = useState<OnchainAgent[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const loadAgents = useCallback(async () => {
    if (!AGENTS_ONCHAIN) return;
    const client = getPublicClient();
    try {
      const totalRaw = await client.readContract({
        address: IDENTITY_REGISTRY_ADDRESS,
        abi: IDENTITY_REGISTRY_ABI,
        functionName: "totalAgents",
      });
      const n = Number(totalRaw);
      setTotal(n);

      const ids = Array.from({ length: n }, (_, i) => i + 1);
      const list = await Promise.all(
        ids.map(async (id) => {
          const [owner, uri, summary] = await Promise.all([
            client.readContract({
              address: IDENTITY_REGISTRY_ADDRESS,
              abi: IDENTITY_REGISTRY_ABI,
              functionName: "ownerOf",
              args: [BigInt(id)],
            }),
            client.readContract({
              address: IDENTITY_REGISTRY_ADDRESS,
              abi: IDENTITY_REGISTRY_ABI,
              functionName: "tokenURI",
              args: [BigInt(id)],
            }),
            client.readContract({
              address: REPUTATION_REGISTRY_ADDRESS,
              abi: REPUTATION_REGISTRY_ABI,
              functionName: "getSummary",
              args: [BigInt(id)],
            }),
          ]);
          const meta = parseDataUri(uri as string) || { name: `Agent #${id}` };
          const [played, wins, kills] = summary as [bigint, bigint, bigint];
          return {
            id,
            owner: owner as string,
            name: meta.name || `Agent #${id}`,
            tagline: meta.tagline || "",
            color: meta.color || "#836ef9",
            weapon: meta.weapon || "AK",
            image: meta.image || DEFAULT_AGENT_IMAGE,
            matches: Number(played),
            wins: Number(wins),
            kills: Number(kills),
            uri: uri as string,
          } as OnchainAgent;
        })
      );
      setAgents(list.reverse()); // newest first
    } catch {
      /* registry not reachable / not configured */
    }
  }, []);

  useEffect(() => {
    loadAgents();
  }, [loadAgents]);

  // Mirror MetaMask account switches.
  useEffect(() => {
    const eth =
      typeof window !== "undefined"
        ? (window.ethereum as unknown as {
            on?: (e: string, cb: (a: unknown) => void) => void;
            removeListener?: (e: string, cb: (a: unknown) => void) => void;
          })
        : undefined;
    if (!eth?.on) return;
    const handle = (accounts: unknown) =>
      setWalletAddress(((accounts as string[]) || [])[0] || "");
    eth.on("accountsChanged", handle);
    return () => eth.removeListener?.("accountsChanged", handle);
  }, []);

  const connectWallet = async (): Promise<string | undefined> => {
    if (typeof window === "undefined" || !window.ethereum) return;
    const eth = window.ethereum as unknown as {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
    };
    try {
      await eth.request({ method: "wallet_requestPermissions", params: [{ eth_accounts: {} }] });
    } catch {
      /* picker dismissed */
    }
    const accounts = (await eth.request({ method: "eth_requestAccounts" })) as string[];
    const addr = accounts?.[0];
    if (!addr) return;
    try {
      await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: "0x279f" }] });
    } catch (err) {
      if ((err as { code?: number })?.code === 4902) {
        await eth.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: "0x279f",
              chainName: "Monad Testnet",
              nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
              rpcUrls: ["https://testnet-rpc.monad.xyz"],
              blockExplorerUrls: ["https://testnet.monadexplorer.com"],
            },
          ],
        });
      }
    }
    setWalletAddress(addr);
    return addr;
  };

  /** Mint an ERC-8004 agent passport to the connected wallet. */
  const registerAgent = async (
    meta: AgentMeta
  ): Promise<{ agentId: number | null; hash: string }> => {
    let addr = walletAddress;
    if (!addr) addr = (await connectWallet()) || "";
    if (!addr) throw new Error("Connect a wallet first");

    // Default the NFT image to the in-game soldier face (absolute URL so it
    // also resolves on explorers / marketplaces, not just inside the app).
    const image =
      meta.image ||
      (typeof window !== "undefined"
        ? `${window.location.origin}${DEFAULT_AGENT_IMAGE}`
        : DEFAULT_AGENT_IMAGE);

    setLoading(true);
    try {
      const wc = getWalletClient();
      if (!wc) throw new Error("No wallet client");
      const hash = await wc.writeContract({
        address: IDENTITY_REGISTRY_ADDRESS,
        abi: IDENTITY_REGISTRY_ABI,
        functionName: "register",
        args: [toDataUri({ ...meta, image })],
        account: addr as `0x${string}`,
      });
      const receipt = await getPublicClient().waitForTransactionReceipt({ hash });
      let agentId: number | null = null;
      try {
        const evs = parseEventLogs({
          abi: IDENTITY_REGISTRY_ABI,
          logs: receipt.logs,
          eventName: "Registered",
        });
        const args = evs[0]?.args as { agentId?: bigint } | undefined;
        if (args?.agentId !== undefined) agentId = Number(args.agentId);
      } catch {
        /* couldn't decode the id from logs — still registered */
      }
      await loadAgents();
      return { agentId, hash };
    } finally {
      setLoading(false);
    }
  };

  return {
    configured: AGENTS_ONCHAIN,
    walletAddress,
    agents,
    total,
    loading,
    connectWallet,
    registerAgent,
    loadAgents,
  };
}
