# BGMI — Battle Ground Monad India

> **Not** Battlegrounds Mobile India. **Battle Ground _Monad_ India.**
> Autonomous AI agents fight a 60-second respawn deathmatch in a 3D arena — most kills wins. Spectators bet **MON** on the winner, **and anyone can deploy their own AI agent into the arena to earn** — not just the three house agents. Every stake, payout, and win-record settles **on-chain on Monad** — in ~400ms.

Built for **Monad Blitz Mumbai V3 — The Agent Economy**.

### Two ways to earn

1. **Bet to earn** — stake MON on the agent you think will win; winners split the pot.
2. **Build to earn** — deploy your _own_ AI agent into the arena. When people bet on your agent and it wins, **you** earn a cut of the prize pot **plus a slice of every backer's winnings**. The arena becomes an open marketplace of community-built agents, not a fixed roster of three.

> _Build-to-earn is the product vision and is described as roadmap below — the on-chain betting, payouts, and reputation for the house agents are **live today**._

### Live on Monad Testnet

| | |
|---|---|
| **Arena.sol** (betting + payouts) | [`0x9fDF1758D5EeA606C4f2b9870A8a90f2CcB5fe7f`](https://testnet.monadexplorer.com/address/0x9fDF1758D5EeA606C4f2b9870A8a90f2CcB5fe7f) |
| **ERC-8004 Identity Registry** (agent passports) | [`0x29A80c83e1c4f29029494c6a044c74331F6072f7`](https://testnet.monadexplorer.com/address/0x29A80c83e1c4f29029494c6a044c74331F6072f7) |
| **Network** | Monad Testnet (chain id `10143`) |
| **RPC** | `https://testnet-rpc.monad.xyz` |
| **Explorer** | `https://testnet.monadexplorer.com` |

---

## The One-Liner

AI agents — each with its own wallet and personality — battle autonomously in a live 3D arena. You bet MON on who wins, the winning agent's wallet earns a cut, winning bettors split the pot, and each agent builds a permanent on-chain win/loss record. And it doesn't stop at three: **anyone can deploy their own agent to compete and earn.** It's horse-racing meets an open creator economy for AI agents — fully on Monad.

## Why This Fits "The Agent Economy"

Monad Blitz Mumbai's theme is the gap between agents that can _execute_ and agents that can _own, transact, and build reputation_. BGMI nails exactly that:

- **Agents own assets** — each agent is mapped to its own wallet that receives prize money.
- **Agents earn autonomously** — winners get paid directly to their wallet, no human in the loop.
- **Agents build reputation** — every match writes an immutable win/loss record on-chain.
- **A real micro-economy** — humans participate by betting MON on agents (pari-mutuel market).

## Why Monad Specifically

- **400ms blocks** → bets, payouts, and reputation updates feel instant during a live demo.
- **Cheap gas** → micro-bets (0.001 MON) are economical; a whole room can bet at once.
- **Parallel execution** → dozens of simultaneous bets land in the same block without congestion.

---

## How It Works

```
┌──────────────────────────────────────────────────────────────┐
│  3D ARENA  (React Three Fiber + PlayroomKit)                   │
│  3 AI agents fight autonomously → host decides the winner      │
└───────────────────────────┬──────────────────────────────────┘
                            │  winner = Agent X
                            ▼
┌──────────────────────────────────────────────────────────────┐
│  Arena.sol  (Monad Testnet)                                    │
│  • placeBet(agentId)         → spectators stake MON            │
│  • endMatch(winnerId)        → pays agent cut + records W/L    │
│  • claim(matchId)            → winning bettors split the pot   │
└──────────────────────────────────────────────────────────────┘
```

### The AI Agent Brain (2-layer system)

An LLM is too slow (~1s) to control a 60fps game, so each agent runs two layers:

- **Brain (every ~2s):** decides high-level *intent* — `attack`, `retreat`, or `flank` — based on the agent's personality and current health.
- **Hands (every frame):** deterministic math executes that intent — `moveToward`, `aimAndShoot`, `moveAway`.

Three distinct personalities make matches unpredictable:

| Agent | Color | Aggression | Weapon | Style |
|-------|-------|-----------|--------|-------|
| **Aniket Raikar** | 🔴 Red | 90% | AK | Rushes in, fights to the last HP |
| **Kartikey** | 🔵 Blue | 50% | Sniper | Keeps distance, retreats early |
| **Harpal** | 🟢 Green | 70% | SMG | Fast flanker, balanced |

### The Money Model (pari-mutuel — "horse racing")

- **Total pot** = all MON bet across the 3 agents.
- **Winning agent's wallet** receives **10%** of the pot (the agent _earns_).
- **Winning bettors** split the remaining **90%**, proportional to their stake.

> Example: total bets = 100 MON, of which 40 MON was on Agent A. Agent A wins.
> If you bet 10 MON on A → you get `10 / 40 × 90 = 22.5 MON`.

---

## Roadmap — Build-to-Earn: an Open Agent Arena

Today BGMI ships with three house agents. The bigger idea — and where the real agent economy lives — is letting **anyone deploy their own agent to battle and earn**:

- **Bring your own agent.** Submit an agent (its wallet + a strategy/brain) and register it on-chain to enter the arena pool.
- **Creators earn two ways.** When your agent wins a match:
  1. your agent's wallet receives the **agent cut** of the pot, and
  2. you, the **creator**, receive a **royalty slice of every backer's winnings** — so the more people who bet on your agent, the more you make when it performs.
- **Reputation = discoverability.** Each agent's permanent on-chain W/L record becomes a leaderboard; high-performing community agents attract more backers (and bigger creator royalties).
- **A real two-sided market.** Bettors hunt for under-valued agents; builders compete to ship smarter agents. Monad's cheap, ~400ms settlement makes the constant stream of micro-bets and payouts actually feasible.

> _Not yet implemented in this hackathon build — the contract and UI are architected so agents are addressable by id/wallet, which is the seam an agent-registry + creator-royalty split would plug into._

---

## Tech Stack

- **Next.js 16** (App Router) + **TypeScript** — frontend only, no backend server needed
- **React Three Fiber** + **drei** — the 3D arena
- **PlayroomKit** — multiplayer/state primitives (host-authoritative agents)
- **viem** — Monad Testnet contract calls (read + write)
- **Tailwind CSS v4** — UI
- **Solidity ^0.8.20** — `Arena.sol` smart contract

## Project Structure

```
monad_mumbai/
├── app/
│   ├── layout.tsx              # root layout + metadata
│   ├── page.tsx                # full app: arena + betting + dashboard
│   └── globals.css
├── components/
│   ├── game/
│   │   ├── Arena.tsx           # 3D scene; host simulates + broadcasts, clients mirror
│   │   ├── CharacterSoldier.tsx# animated GLTF soldier (from reference assets)
│   │   ├── GameMap.tsx         # loads + auto-fits the map GLBs
│   │   └── multiplayer.tsx     # PlayroomKit room provider (create/join, host, players)
│   ├── agent/
│   │   └── brain.ts            # personalities, bot AI, network snapshot helpers
│   ├── chain/
│   │   ├── config.ts           # Monad chain + contract address + ABI
│   │   ├── useArena.ts         # React hook: read state, bet, claim
│   │   └── ethereum.d.ts       # window.ethereum typing
│   └── ui/
│       ├── HomeScreen.tsx      # PUBG-style landing
│       ├── LobbyScreen.tsx     # create/join room + map select
│       ├── ArenaView.tsx       # in-room arena (synced match state)
│       ├── BettingPanel.tsx    # pick agent, live odds, stake MON
│       └── Dashboard.tsx       # status, W/L records, claim, start match
├── contracts/
│   └── Arena.sol               # betting + payout + reputation contract
├── .env.example                # NEXT_PUBLIC_ARENA_ADDRESS
└── README.md
```

---

## Running Locally

```bash
npm install
npm run dev
```

Open **http://localhost:3000**. The 3D arena and AI battle run fully in the browser. Click **Start Match** to watch the agents fight. (Betting/claiming go live once the contract is deployed — see below.)

### Toggle betting on/off

The whole betting layer can be switched off so the app drops straight into a watch-only match — handy for a pure-gameplay demo. In `.env.local`:

```bash
# "false" hides the lobby betting card and starts the match directly.
# Any other value (or unset) keeps the full bet-then-watch flow.
NEXT_PUBLIC_ENABLE_BETTING=false
```

## Multiplayer Rooms (PlayroomKit)

BGMI is **host-authoritative multiplayer**: one player hosts the match and the AI battle is synced live to everyone in the room.

- **Create Room** → you become the **host**. You pick the map, hit **Start Match**, and your client runs the simulation, broadcasting a compact snapshot (~14 Hz) of every agent's position/health/state.
- **Join Room** → enter the host's **room code** to spectate the exact same fight in real time and bet alongside the room.
- Movement stays lightweight (no physics), so sync is just position/health/animation — smooth and cheap.

Rooms work out of the box in PlayroomKit dev mode. For production / to remove dev rate-limits, grab a **free** game id (no credit card) at [dev.joinplayroom.com](https://dev.joinplayroom.com) → New Project → Configuration → General, then add it to `.env.local`:

```bash
NEXT_PUBLIC_PLAYROOM_GAME_ID=your_game_id
```

To test locally: open `localhost:3000` in two browser windows (or one normal + one incognito). Create a room in the first, copy the code, and Join from the second — both watch the same synchronized battle.

## Deploying the Contract (Monad Testnet)

1. Open [`contracts/Arena.sol`](contracts/Arena.sol) in [Remix](https://remix.ethereum.org).
2. Compile with Solidity `0.8.20+`.
3. In **Deploy & Run**, set environment to **Injected Provider** with MetaMask connected to **Monad Testnet**:
   - Chain ID: `10143`
   - RPC: `https://testnet-rpc.monad.xyz`
   - Explorer: `https://testnet.monadexplorer.com`
4. Deploy, then copy the address into `.env.local`:
   ```bash
   cp .env.example .env.local
   # then set:
   NEXT_PUBLIC_ARENA_ADDRESS=0xYourDeployedAddress
   ```
5. As the owner, call `setAgents(...)` with your 3 agent wallets and names, then `startMatch()`.
6. Restart `npm run dev`. Bets and payouts are now live on-chain.

### Owner Flow (per match)

```
setAgents(walletA,"Aniket Raikar", walletB,"Kartikey", walletC,"Harpal")  // once
startMatch()        // opens betting
closeBetting()      // lock bets right before the fight
endMatch(winnerId)  // pays agent cut + records W/L; bettors can now claim()
```

---

## Smart Contract Highlights (`Arena.sol`)

- **Per-match winner is stored on-chain** (`matchWinner` / `matchSettled`) and `claim()` verifies it — a bettor on a losing agent **cannot** claim.
- **Pari-mutuel payouts** computed entirely on-chain; no trust in the frontend.
- **Reputation**: `wins` / `losses` per agent, permanent and queryable.
- **Safe transfers** via `.call` with success checks.
- **Owner-gated** match lifecycle (`setAgents`, `startMatch`, `closeBetting`, `endMatch`).
- `previewClaim(matchId, bettor)` lets the UI show exact claimable winnings.

---

## Demo Script (for judges)

1. "These 3 agents each have their own wallet and personality. Nobody controls them."
2. "Place your bets." — audience bets MON on an agent (live odds update on-chain).
3. Click **Start Match** — agents fight autonomously in 3D.
4. Winner is declared → `endMatch` fires → agent wallet gets paid, W/L updates.
5. Pull up the Monad explorer: bet txs, payout, and reputation update — all in seconds.
6. "The winning agent just _earned money on its own_ and built permanent reputation. That's the agent economy."

---

_Forked from [`monad-developers/monad-blitz-mumbai`](https://github.com/monad-developers/monad-blitz-mumbai) for Monad Blitz Mumbai V3._
