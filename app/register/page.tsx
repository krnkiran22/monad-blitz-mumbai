"use client";

import { useState } from "react";
import Link from "next/link";
import {
  useAgentRegistry,
  OnchainAgent,
} from "../../components/chain/useAgentRegistry";
import {
  IDENTITY_REGISTRY_ADDRESS,
  REPUTATION_REGISTRY_ADDRESS,
} from "../../components/chain/config";

const EXPLORER = "https://testnet.monadexplorer.com";
const WEAPONS = ["AK", "Sniper", "Pistol", "Shotgun"];
const COLORS = ["#836ef9", "#ef4444", "#3b82f6", "#22c55e", "#f59e0b", "#ec4899"];

const short = (a: string) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "");

export default function RegisterPage() {
  const { configured, walletAddress, agents, total, loading, connectWallet, registerAgent } =
    useAgentRegistry();

  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [weapon, setWeapon] = useState(WEAPONS[0]);
  const [color, setColor] = useState(COLORS[0]);
  const [result, setResult] = useState<{ agentId: number | null; hash: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    setResult(null);
    if (!name.trim()) {
      setError("Give your agent a name.");
      return;
    }
    try {
      const r = await registerAgent({ name: name.trim(), tagline: tagline.trim(), weapon, color });
      setResult(r);
      setName("");
      setTagline("");
    } catch (e) {
      setError((e as Error).message || "Registration failed.");
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0717] text-white">
      {/* glow backdrop */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/3 h-[520px] w-[520px] rounded-full bg-[#836ef9]/20 blur-[140px]" />
        <div className="absolute bottom-0 right-10 h-[420px] w-[420px] rounded-full bg-[#ec4899]/10 blur-[140px]" />
      </div>

      <div className="relative mx-auto max-w-6xl px-6 py-8">
        {/* nav */}
        <div className="flex items-center justify-between">
          <Link href="/" className="text-sm font-bold tracking-widest text-white/70 hover:text-white">
            ← BGMI
          </Link>
          <button
            onClick={() => connectWallet()}
            className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-bold tracking-wide hover:bg-white/10"
          >
            {walletAddress ? short(walletAddress) : "Connect Wallet"}
          </button>
        </div>

        {/* hero */}
        <div className="mt-10 max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#a78bfa]">
            Build to Earn · ERC-8004
          </p>
          <h1 className="mt-3 text-4xl font-black leading-tight sm:text-5xl">
            Deploy your own agent into the arena
          </h1>
          <p className="mt-4 text-white/60">
            Not just 3 house agents — anyone can mint an autonomous fighter. Each registration
            mints an <span className="text-white">ERC-721 agent passport</span> on the on-chain
            Identity Registry, and every battle writes to its{" "}
            <span className="text-white">Reputation Registry</span> track record. Bettors back a
            verifiable record, not a stranger&apos;s JPEG.
          </p>
        </div>

        {!configured && (
          <div className="mt-6 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
            Registry addresses aren&apos;t configured. Set
            <code className="mx-1">NEXT_PUBLIC_IDENTITY_REGISTRY_ADDRESS</code> and
            <code className="mx-1">NEXT_PUBLIC_REPUTATION_REGISTRY_ADDRESS</code> in
            <code className="mx-1">.env.local</code>.
          </div>
        )}

        <div className="mt-10 grid gap-8 lg:grid-cols-[400px_1fr]">
          {/* ── Registration form ── */}
          <div className="rounded-3xl border border-white/10 bg-white/4 p-6 backdrop-blur">
            <h2 className="text-lg font-black tracking-wide">Register an agent</h2>
            <p className="mt-1 text-xs text-white/50">Mints to your connected wallet on Monad Testnet.</p>

            <label className="mt-5 block text-xs font-bold uppercase tracking-wide text-white/50">
              Agent name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Vikram"
              maxLength={32}
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm outline-none focus:border-[#836ef9]"
            />

            <label className="mt-4 block text-xs font-bold uppercase tracking-wide text-white/50">
              Tagline
            </label>
            <input
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="e.g. Never misses from range"
              maxLength={60}
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm outline-none focus:border-[#836ef9]"
            />

            <label className="mt-4 block text-xs font-bold uppercase tracking-wide text-white/50">
              Weapon
            </label>
            <div className="mt-1 grid grid-cols-4 gap-2">
              {WEAPONS.map((w) => (
                <button
                  key={w}
                  onClick={() => setWeapon(w)}
                  className={`rounded-xl border px-2 py-2 text-xs font-bold transition ${
                    weapon === w
                      ? "border-[#836ef9] bg-[#836ef9]/20 text-white"
                      : "border-white/10 bg-black/20 text-white/60 hover:bg-white/5"
                  }`}
                >
                  {w}
                </button>
              ))}
            </div>

            <label className="mt-4 block text-xs font-bold uppercase tracking-wide text-white/50">
              Color
            </label>
            <div className="mt-1 flex gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  style={{ backgroundColor: c }}
                  className={`h-8 w-8 rounded-full transition ${
                    color === c ? "ring-2 ring-white ring-offset-2 ring-offset-[#0b0717]" : "opacity-70 hover:opacity-100"
                  }`}
                />
              ))}
            </div>

            <button
              onClick={submit}
              disabled={loading || !configured}
              className="mt-6 w-full rounded-xl bg-[#836ef9] py-3 text-sm font-black tracking-wide text-white transition hover:bg-[#7259f5] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Minting on Monad…" : walletAddress ? "Register Agent" : "Connect & Register"}
            </button>

            {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

            {result && (
              <div className="mt-4 rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-4 text-sm">
                <p className="font-bold text-emerald-300">
                  Agent registered{result.agentId !== null ? ` as #${result.agentId}` : ""}! 🎉
                </p>
                <a
                  href={`${EXPLORER}/tx/${result.hash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-block text-xs text-emerald-200 underline"
                >
                  View transaction ↗
                </a>
              </div>
            )}

            <div className="mt-6 space-y-1 border-t border-white/10 pt-4 text-[11px] text-white/40">
              <p>
                Identity:{" "}
                <a className="underline" target="_blank" rel="noreferrer" href={`${EXPLORER}/address/${IDENTITY_REGISTRY_ADDRESS}`}>
                  {short(IDENTITY_REGISTRY_ADDRESS)}
                </a>
              </p>
              <p>
                Reputation:{" "}
                <a className="underline" target="_blank" rel="noreferrer" href={`${EXPLORER}/address/${REPUTATION_REGISTRY_ADDRESS}`}>
                  {short(REPUTATION_REGISTRY_ADDRESS)}
                </a>
              </p>
            </div>
          </div>

          {/* ── On-chain roster ── */}
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black tracking-wide">
                On-chain agents <span className="text-white/40">({total})</span>
              </h2>
            </div>

            {agents.length === 0 ? (
              <div className="mt-4 rounded-3xl border border-dashed border-white/10 bg-white/2 p-10 text-center text-white/40">
                No agents registered yet. Be the first — mint one on the left.
              </div>
            ) : (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {agents.map((a) => (
                  <AgentCard key={a.id} agent={a} mine={a.owner.toLowerCase() === walletAddress.toLowerCase()} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function AgentCard({ agent, mine }: { agent: OnchainAgent; mine: boolean }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/4 p-4">
      <div className="flex items-center gap-3">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-lg font-black"
          style={{ backgroundColor: `${agent.color}33`, color: agent.color }}
        >
          {agent.name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate font-bold">{agent.name}</p>
            <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] font-bold text-white/60">
              #{agent.id}
            </span>
            {mine && (
              <span className="rounded-full bg-[#836ef9]/30 px-1.5 py-0.5 text-[10px] font-bold text-[#c4b5fd]">
                YOURS
              </span>
            )}
          </div>
          <p className="truncate text-xs text-white/40">{agent.tagline || `${agent.weapon} specialist`}</p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <Stat label="Matches" value={agent.matches} />
        <Stat label="Wins" value={agent.wins} />
        <Stat label="Kills" value={agent.kills} />
      </div>

      <div className="mt-3 flex items-center justify-between text-[11px] text-white/40">
        <span>{agent.weapon}</span>
        <a
          className="underline"
          target="_blank"
          rel="noreferrer"
          href={`${EXPLORER}/address/${agent.owner}`}
        >
          {short(agent.owner)}
        </a>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-black/30 py-2">
      <p className="text-base font-black">{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-white/40">{label}</p>
    </div>
  );
}
