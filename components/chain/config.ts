import { createPublicClient, createWalletClient, custom, http } from "viem";

export const monadTestnet = {
  id: 10143,
  name: "Monad Testnet",
  nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://testnet-rpc.monad.xyz"] },
  },
  blockExplorers: {
    default: { name: "Monad Explorer", url: "https://testnet.monadexplorer.com" },
  },
  testnet: true,
} as const;

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

// Set NEXT_PUBLIC_ARENA_ADDRESS in .env.local after deploying Arena.sol.
export const ARENA_CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_ARENA_ADDRESS ||
  ZERO_ADDRESS) as `0x${string}`;

// ERC-8004 registries (deploy AgentRegistry.sol, then set these in .env.local).
export const IDENTITY_REGISTRY_ADDRESS = (process.env
  .NEXT_PUBLIC_IDENTITY_REGISTRY_ADDRESS || ZERO_ADDRESS) as `0x${string}`;
export const REPUTATION_REGISTRY_ADDRESS = (process.env
  .NEXT_PUBLIC_REPUTATION_REGISTRY_ADDRESS || ZERO_ADDRESS) as `0x${string}`;

// True once both ERC-8004 registries have real addresses configured.
export const AGENTS_ONCHAIN =
  IDENTITY_REGISTRY_ADDRESS !== ZERO_ADDRESS &&
  REPUTATION_REGISTRY_ADDRESS !== ZERO_ADDRESS;

// Toggle the on-chain betting flow. When NEXT_PUBLIC_ENABLE_BETTING is "false"
// the lobby hides the betting card and the match starts straight away; any
// other value (or unset) keeps the full bet-then-watch flow.
export const BETTING_ENABLED =
  process.env.NEXT_PUBLIC_ENABLE_BETTING !== "false";

export const ARENA_ABI = [
  {
    inputs: [],
    name: "owner",
    outputs: [{ type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "startMatch",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "closeBetting",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "winnerId", type: "uint8" }],
    name: "endMatch",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "matchId",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "bettingOpen",
    outputs: [{ type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "matchActive",
    outputs: [{ type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "lastWinner",
    outputs: [{ type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "agentId", type: "uint8" }],
    name: "placeBet",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [{ name: "_matchId", type: "uint256" }],
    name: "claim",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "_matchId", type: "uint256" },
      { name: "bettor", type: "address" },
    ],
    name: "previewClaim",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "", type: "uint256" }],
    name: "matchSettled",
    outputs: [{ type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "", type: "uint256" }],
    name: "matchWinner",
    outputs: [{ type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "id", type: "uint8" }],
    name: "getAgent",
    outputs: [
      { name: "wallet", type: "address" },
      { name: "name", type: "string" },
      { name: "wins", type: "uint256" },
      { name: "losses", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "_matchId", type: "uint256" }],
    name: "getTotalPot",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "_matchId", type: "uint256" }],
    name: "getBetAmounts",
    outputs: [
      { name: "", type: "uint256" },
      { name: "", type: "uint256" },
      { name: "", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "_matchId", type: "uint256" },
      { name: "bettor", type: "address" },
      { name: "agentId", type: "uint8" },
    ],
    name: "getMyBet",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

// ── ERC-8004 Identity Registry (agent passport NFT) ──
export const IDENTITY_REGISTRY_ABI = [
  {
    inputs: [{ name: "agentURI", type: "string" }],
    name: "register",
    outputs: [{ name: "agentId", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "agentId", type: "uint256" },
      { name: "agentURI", type: "string" },
    ],
    name: "setAgentURI",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "totalAgents",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "agentId", type: "uint256" }],
    name: "exists",
    outputs: [{ type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "tokenId", type: "uint256" }],
    name: "ownerOf",
    outputs: [{ type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "tokenId", type: "uint256" }],
    name: "tokenURI",
    outputs: [{ type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "agentId", type: "uint256" },
      { indexed: true, name: "owner", type: "address" },
      { indexed: false, name: "agentURI", type: "string" },
    ],
    name: "Registered",
    type: "event",
  },
] as const;

// ── ERC-8004 Reputation Registry (feedback + match track record) ──
export const REPUTATION_REGISTRY_ABI = [
  {
    inputs: [
      { name: "agentId", type: "uint256" },
      { name: "value", type: "int128" },
      { name: "valueDecimals", type: "uint8" },
      { name: "tag", type: "bytes32" },
      { name: "uri", type: "string" },
    ],
    name: "giveFeedback",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "agentId", type: "uint256" },
      { name: "matchId", type: "uint256" },
      { name: "kills", type: "uint256" },
      { name: "won", type: "bool" },
    ],
    name: "recordMatchResult",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "agentId", type: "uint256" }],
    name: "getSummary",
    outputs: [
      { name: "played", type: "uint256" },
      { name: "agentWins", type: "uint256" },
      { name: "kills", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "agentId", type: "uint256" }],
    name: "feedbackCount",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "agentId", type: "uint256" },
      { indexed: true, name: "matchId", type: "uint256" },
      { indexed: false, name: "kills", type: "uint256" },
      { indexed: false, name: "won", type: "bool" },
    ],
    name: "MatchRecorded",
    type: "event",
  },
] as const;

export function getPublicClient() {
  return createPublicClient({
    chain: monadTestnet,
    transport: http(),
  });
}

export function getWalletClient() {
  if (typeof window === "undefined" || !window.ethereum) return null;
  return createWalletClient({
    chain: monadTestnet,
    transport: custom(window.ethereum),
  });
}
