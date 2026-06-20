"use client";

import { useState, useEffect, useCallback } from "react";
import { parseEther, formatEther } from "viem";
import {
  getPublicClient,
  getWalletClient,
  ARENA_ABI,
  ARENA_CONTRACT_ADDRESS,
} from "./config";

export interface AgentInfo {
  id: number;
  name: string;
  wallet: string;
  wins: number;
  losses: number;
  totalBet: string;
}

export interface ArenaState {
  matchId: bigint;
  bettingOpen: boolean;
  matchActive: boolean;
  lastWinner: number;
  totalPot: string;
  agents: AgentInfo[];
  myBets: [string, string, string];
  claimable: string; // MON the connected wallet can claim for the current match
  matchSettled: boolean; // current match has been settled on-chain
  isOwner: boolean; // connected wallet owns the contract (can run matches)
}

const AGENT_NAMES = ["Aniket Raikar", "Kartikey", "Harpal"];
const AGENT_COLORS = ["#ef4444", "#3b82f6", "#22c55e"];

export function useArena(address?: string) {
  const [state, setState] = useState<ArenaState>({
    matchId: 0n,
    bettingOpen: false,
    matchActive: false,
    lastWinner: 0,
    totalPot: "0",
    agents: AGENT_NAMES.map((name, i) => ({
      id: i,
      name,
      wallet: "",
      wins: 0,
      losses: 0,
      totalBet: "0",
    })),
    myBets: ["0", "0", "0"],
    claimable: "0",
    matchSettled: false,
    isOwner: false,
  });
  const [loading, setLoading] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string>(address || "");
  const [monBalance, setMonBalance] = useState<string>("0.00");

  const refresh = useCallback(async () => {
    const client = getPublicClient();
    const read = (functionName: string, args?: unknown[]) =>
      client.readContract({ address: ARENA_CONTRACT_ADDRESS, abi: ARENA_ABI, functionName, args } as never);

    try {
      // matchId is needed for the per-match reads, so fetch it (and the wallet
      // balance) first; then fire EVERYTHING else off in a single parallel wave
      // so a refresh is one round-trip instead of six.
      const [matchId, bal] = await Promise.all([
        read("matchId") as Promise<bigint>,
        walletAddress
          ? client.getBalance({ address: walletAddress as `0x${string}` })
          : Promise.resolve(null),
      ]);
      if (bal !== null) setMonBalance(parseFloat(formatEther(bal)).toFixed(3));

      const w = walletAddress as `0x${string}` | undefined;
      const [
        bettingOpen,
        matchActive,
        lastWinner,
        totalPot,
        betAmounts,
        agent0,
        agent1,
        agent2,
        matchSettled,
        owner,
        myBet0,
        myBet1,
        myBet2,
        claim,
      ] = await Promise.all([
        read("bettingOpen"),
        read("matchActive"),
        read("lastWinner"),
        read("getTotalPot", [matchId]),
        read("getBetAmounts", [matchId]),
        read("getAgent", [0]),
        read("getAgent", [1]),
        read("getAgent", [2]),
        read("matchSettled", [matchId]),
        read("owner"),
        w ? read("getMyBet", [matchId, w, 0]) : Promise.resolve(0n),
        w ? read("getMyBet", [matchId, w, 1]) : Promise.resolve(0n),
        w ? read("getMyBet", [matchId, w, 2]) : Promise.resolve(0n),
        w ? read("previewClaim", [matchId, w]) : Promise.resolve(0n),
      ]);

      const agentData = [agent0, agent1, agent2];
      const myBets: [string, string, string] = [
        formatEther(myBet0 as bigint),
        formatEther(myBet1 as bigint),
        formatEther(myBet2 as bigint),
      ];
      const claimable = formatEther(claim as bigint);

      const betAmountsArr = betAmounts as [bigint, bigint, bigint];

      setState({
        matchId: matchId as bigint,
        bettingOpen: bettingOpen as boolean,
        matchActive: matchActive as boolean,
        lastWinner: lastWinner as number,
        totalPot: formatEther(totalPot as bigint),
        agents: agentData.map((a, i) => ({
          id: i,
          name: AGENT_NAMES[i],
          wallet: (a as [string, string, bigint, bigint])[0],
          wins: Number((a as [string, string, bigint, bigint])[2]),
          losses: Number((a as [string, string, bigint, bigint])[3]),
          totalBet: formatEther(betAmountsArr[i]),
        })),
        myBets,
        claimable,
        matchSettled: matchSettled as boolean,
        isOwner:
          !!walletAddress &&
          (owner as string).toLowerCase() === walletAddress.toLowerCase(),
      });
    } catch {
      // Contract not deployed yet - use mock state for development
    }
  }, [walletAddress]);

  useEffect(() => {
    refresh();
    // Monad's ~400ms blocks make frequent polling cheap; 1.5s keeps bets, the
    // pot, and the claim button feeling near-instant after a tx lands.
    const interval = setInterval(refresh, 1500);
    return () => clearInterval(interval);
  }, [refresh]);

  // Keep the app in sync when the user switches accounts inside MetaMask.
  useEffect(() => {
    const eth =
      typeof window !== "undefined"
        ? (window.ethereum as unknown as {
            on?: (e: string, cb: (a: unknown) => void) => void;
            removeListener?: (e: string, cb: (a: unknown) => void) => void;
          })
        : undefined;
    if (!eth?.on) return;
    const handle = (accounts: unknown) => {
      setWalletAddress(((accounts as string[]) || [])[0] || "");
    };
    eth.on("accountsChanged", handle);
    return () => eth.removeListener?.("accountsChanged", handle);
  }, []);

  const connectWallet = async () => {
    if (typeof window === "undefined" || !window.ethereum) return; // no injected wallet
    const eth = window.ethereum as unknown as {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
    };

    // Force MetaMask to show its account picker every time so the user can pick
    // (or switch to) the exact account they want. eth_requestAccounts on its own
    // silently reuses whatever account was connected last and never re-prompts.
    try {
      await eth.request({
        method: "wallet_requestPermissions",
        params: [{ eth_accounts: {} }],
      });
    } catch {
      // user dismissed the picker without choosing — keep current selection
    }

    const accounts = (await eth.request({ method: "eth_requestAccounts" })) as string[];
    const addr = accounts?.[0];
    if (!addr) return;

    // Make sure the selected account is pointed at Monad testnet (0x279f = 10143).
    try {
      await eth.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0x279f" }],
      });
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

  const placeBet = async (agentId: number, amountEth: string) => {
    if (!walletAddress) { await connectWallet(); return; }
    setLoading(true);
    try {
      const wc = getWalletClient();
      if (!wc) throw new Error("No wallet");
      const hash = await wc.writeContract({
        address: ARENA_CONTRACT_ADDRESS,
        abi: ARENA_ABI,
        functionName: "placeBet",
        args: [agentId as 0 | 1 | 2],
        value: parseEther(amountEth),
        account: walletAddress as `0x${string}`,
      });
      await getPublicClient().waitForTransactionReceipt({ hash });
      await refresh();
    } finally {
      setLoading(false);
    }
  };

  // Stake the same amount on every agent (the intended demo flow: 0.5 / 0.5 /
  // 0.5). Runs the three bets sequentially so the wallet nonces don't collide.
  const betAll = async (amountEth: string) => {
    if (!walletAddress) {
      await connectWallet();
      return;
    }
    for (let i = 0; i < 3; i++) {
      await placeBet(i, amountEth);
    }
  };

  // ── Owner-only match orchestration (host runs the on-chain round) ──────────
  const ownerTx = async (functionName: "startMatch" | "closeBetting") => {
    if (!walletAddress) { await connectWallet(); return; }
    setLoading(true);
    try {
      const wc = getWalletClient();
      if (!wc) throw new Error("No wallet");
      const hash = await wc.writeContract({
        address: ARENA_CONTRACT_ADDRESS,
        abi: ARENA_ABI,
        functionName,
        account: walletAddress as `0x${string}`,
      });
      await getPublicClient().waitForTransactionReceipt({ hash });
      await refresh();
    } finally {
      setLoading(false);
    }
  };

  /** Open a fresh betting round on-chain (owner). Safe to skip if already open. */
  const openBetting = async () => {
    await ownerTx("startMatch");
  };

  /** Stop accepting bets right before the fight begins (owner). */
  const lockBetting = async () => {
    await ownerTx("closeBetting");
  };

  /** Settle the match with the winning agent + pay the agent cut (owner). */
  const settleMatch = async (winnerId: number) => {
    if (!walletAddress) return;
    setLoading(true);
    try {
      const wc = getWalletClient();
      if (!wc) throw new Error("No wallet");
      const hash = await wc.writeContract({
        address: ARENA_CONTRACT_ADDRESS,
        abi: ARENA_ABI,
        functionName: "endMatch",
        args: [winnerId as 0 | 1 | 2],
        account: walletAddress as `0x${string}`,
      });
      await getPublicClient().waitForTransactionReceipt({ hash });
      await refresh();
    } finally {
      setLoading(false);
    }
  };

  const claimWinnings = async (matchId: bigint) => {
    if (!walletAddress) return;
    setLoading(true);
    try {
      const wc = getWalletClient();
      if (!wc) throw new Error("No wallet");
      const hash = await wc.writeContract({
        address: ARENA_CONTRACT_ADDRESS,
        abi: ARENA_ABI,
        functionName: "claim",
        args: [matchId],
        account: walletAddress as `0x${string}`,
      });
      await getPublicClient().waitForTransactionReceipt({ hash });
      await refresh();
    } finally {
      setLoading(false);
    }
  };

  return {
    state,
    loading,
    walletAddress,
    monBalance,
    connectWallet,
    placeBet,
    betAll,
    claimWinnings,
    openBetting,
    lockBetting,
    settleMatch,
    refresh,
    AGENT_COLORS,
  };
}
