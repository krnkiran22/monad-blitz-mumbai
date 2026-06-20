export type Intent = "engage" | "strafe" | "flank" | "cover" | "retreat" | "harass" | "idle";

export interface AgentPersonality {
  name: string;
  color: string;
  aggression: number; // 0-1: how aggressive
  retreatThreshold: number; // health % to start retreating
  speed: number;
  fireRate: number; // ms between shots
  weapon: string;
}

export const AGENT_PERSONALITIES: AgentPersonality[] = [
  { name: "Aniket Raikar", color: "#ef4444", aggression: 0.9, retreatThreshold: 15, speed: 1.1, fireRate: 300, weapon: "AK" },
  { name: "Kartikey", color: "#3b82f6", aggression: 0.5, retreatThreshold: 40, speed: 0.9, fireRate: 500, weapon: "Sniper" },
  { name: "Harpal", color: "#22c55e", aggression: 0.7, retreatThreshold: 25, speed: 1.2, fireRate: 400, weapon: "SMG" },
];

export interface BotState {
  id: number;
  personality: AgentPersonality;
  health: number;
  intent: Intent;
  lastThinkAt: number;
  lastShootAt: number;
  lastJumpAt: number;
  pos: { x: number; y: number; z: number };
  vy: number; // vertical velocity (jumping)
  angle: number;
  dead: boolean;
  moving: boolean;
  shooting: boolean;
  crouching: boolean;
  target: number; // index of the enemy this bot is engaging
  rival: number; // preferred opponent for this match (varies each match)
  strafeDir: 1 | -1;
  coverPos: { x: number; z: number } | null;
  anim: string; // animation name, computed on host, mirrored to clients
  kills: number; // confirmed kills this match (decides the winner)
  deaths: number;
  respawnAt: number; // timestamp when a dead bot comes back
}

/** Compact, network-friendly snapshot the host broadcasts each tick. */
export interface BotSnap {
  x: number;
  y: number;
  z: number;
  a: number; // angle
  h: number; // health
  d: 0 | 1; // dead
  t: number; // target index
  an: string; // animation
  k: number; // kills
}

const ARENA = 10;

// Approximate cover spots scattered around the play area (crates/containers).
const COVER_POINTS = [
  { x: -7, z: -6 },
  { x: 7, z: -6 },
  { x: -7, z: 6 },
  { x: 7, z: 6 },
  { x: 0, z: -8 },
  { x: 0, z: 8 },
];

const SPAWNS = [
  { x: -8, y: 0, z: -8 },
  { x: 8, y: 0, z: -8 },
  { x: 0, y: 0, z: 8 },
];

export function createBots(): BotState[] {
  // Per-match randomization so no two matches play the same way.
  const ringDir = Math.random() < 0.5 ? 1 : 2; // direction of the rivalry ring
  const spawnOrder = shuffle([0, 1, 2]);
  const openers: Intent[] = ["engage", "harass", "flank"];

  return AGENT_PERSONALITIES.map((p, i) => {
    const rival = (i + ringDir) % AGENT_PERSONALITIES.length;
    return {
      id: i,
      personality: p,
      health: 100,
      intent: openers[Math.floor(Math.random() * openers.length)],
      lastThinkAt: 0,
      lastShootAt: 0,
      lastJumpAt: 0,
      pos: { ...SPAWNS[spawnOrder[i]] },
      vy: 0,
      angle: 0,
      dead: false,
      moving: false,
      shooting: false,
      crouching: false,
      target: rival,
      rival,
      strafeDir: Math.random() < 0.5 ? 1 : -1,
      coverPos: null,
      anim: "Idle",
      kills: 0,
      deaths: 0,
      respawnAt: 0,
    };
  });
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Bring a dead bot back to life at its spawn point (kills/deaths preserved). */
export function respawnBot(bot: BotState) {
  bot.health = 100;
  bot.dead = false;
  bot.pos = { ...SPAWNS[bot.id] };
  bot.vy = 0;
  bot.moving = false;
  bot.shooting = false;
  bot.crouching = false;
  bot.intent = "engage";
  bot.target = bot.rival;
  bot.coverPos = null;
  bot.respawnAt = 0;
  bot.lastThinkAt = 0;
  bot.anim = "Idle";
}

export function botAnimation(bot: BotState): string {
  return bot.anim || "Idle";
}

function fireRange(b: BotState) {
  return b.personality.weapon === "Sniper" ? 22 : b.personality.weapon === "SMG" ? 10 : 14;
}

function dist(a: { x: number; z: number }, b: { x: number; z: number }) {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function nearestEnemy(bot: BotState, enemies: BotState[]) {
  return enemies.reduce<BotState | null>((best, e) => {
    if (!best) return e;
    return dist(bot.pos, e.pos) < dist(bot.pos, best.pos) ? e : best;
  }, null);
}

function nearestCover(bot: BotState) {
  return COVER_POINTS.reduce((best, c) =>
    dist(bot.pos, c) < dist(bot.pos, best) ? c : best
  );
}

function byId(bots: BotState[], id: number) {
  return bots.find((b) => b.id === id) ?? null;
}

/** Pick who to fight: stick with this match's rival, else the nearest foe.
 *  Keeping rivalries alive spreads the action so all three keep fighting
 *  instead of everyone ganging the same target. */
function pickTarget(bot: BotState, alive: BotState[]): BotState {
  const rival = byId(alive, bot.rival);
  if (rival && Math.random() < 0.7) return rival;
  return nearestEnemy(bot, alive) ?? rival ?? alive[0];
}

/** Weighted random pick from [option, weight] pairs. */
function weighted<T>(opts: [T, number][]): T {
  const total = opts.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * total;
  for (const [opt, w] of opts) {
    r -= w;
    if (r <= 0) return opt;
  }
  return opts[0][0];
}

export function thinkBot(bot: BotState, target: BotState): Intent {
  const d = dist(bot.pos, target.pos);
  const range = fireRange(bot);
  const agg = bot.personality.aggression;

  if (bot.health < bot.personality.retreatThreshold) {
    return weighted<Intent>([["retreat", 0.6], ["cover", 0.4]]);
  }

  if (d > range) {
    // Out of range: close the distance, often from an angle.
    return weighted<Intent>([["engage", 0.55 + agg * 0.2], ["flank", 0.45]]);
  }
  if (d < 6) {
    // Close quarters: dance, fire-and-fall-back, or duck behind cover.
    return weighted<Intent>([
      ["strafe", 0.35 + agg * 0.2],
      ["harass", 0.35],
      ["cover", 0.3 - agg * 0.15],
    ]);
  }
  // Mid range: pressure, hit-and-run, reposition.
  return weighted<Intent>([
    ["strafe", 0.3],
    ["harass", 0.3],
    ["engage", 0.2 + agg * 0.2],
    ["cover", 0.2],
  ]);
}

function integrateJump(bot: BotState, dt: number) {
  if (bot.vy !== 0 || bot.pos.y > 0) {
    bot.vy += -20 * dt; // gravity
    bot.pos.y += bot.vy * dt;
    if (bot.pos.y <= 0) {
      bot.pos.y = 0;
      bot.vy = 0;
    }
  }
}

function pickAnim(bot: BotState): string {
  if (bot.dead) return "Death";
  if (bot.pos.y > 0.15) return "Jump";
  if (bot.crouching) return bot.shooting ? "Idle_Shoot" : "Duck";
  if (bot.moving) return bot.shooting ? "Run_Gun" : "Run";
  if (bot.shooting) return "Idle_Shoot";
  return "Idle";
}

export function tickBot(
  bot: BotState,
  enemies: BotState[],
  dt: number,
  now: number,
  onShoot: (from: BotState, target: BotState) => void
) {
  integrateJump(bot, dt);

  if (bot.dead) {
    bot.anim = "Death";
    bot.moving = false;
    bot.shooting = false;
    return;
  }

  const alive = enemies.filter((e) => !e.dead);
  if (alive.length === 0) {
    bot.moving = false;
    bot.shooting = false;
    bot.anim = pickAnim(bot);
    return;
  }

  // Re-pick target + strategy every ~1.3s (or immediately if the target died).
  let target = byId(alive, bot.target);
  if (!target || now - bot.lastThinkAt > 1300) {
    target = pickTarget(bot, alive);
    bot.target = target.id;
    bot.intent = thinkBot(bot, target);
    bot.lastThinkAt = now;
    if (bot.intent === "cover") bot.coverPos = nearestCover(bot);
    if (bot.intent === "strafe" || bot.intent === "flank") {
      bot.strafeDir = Math.random() < 0.5 ? 1 : -1;
    }
  }
  if (!target) return;

  const dx = target.pos.x - bot.pos.x;
  const dz = target.pos.z - bot.pos.z;
  const d = Math.hypot(dx, dz) || 0.0001;
  const nx = dx / d;
  const nz = dz / d;
  const range = fireRange(bot);

  // Always face the target.
  bot.angle = Math.atan2(dx, dz);
  bot.moving = false;
  bot.crouching = false;

  let mvx = 0;
  let mvz = 0;

  switch (bot.intent) {
    case "engage":
      if (d > range * 0.7) {
        mvx = nx;
        mvz = nz;
      }
      break;
    case "flank": {
      const px = -nz * bot.strafeDir;
      const pz = nx * bot.strafeDir;
      mvx = nx * 0.5 + px * 0.85;
      mvz = nz * 0.5 + pz * 0.85;
      break;
    }
    case "strafe": {
      const px = -nz * bot.strafeDir;
      const pz = nx * bot.strafeDir;
      const ideal = range * 0.6;
      const toward = d > ideal ? 0.5 : d < ideal * 0.6 ? -0.5 : 0;
      mvx = px + nx * toward;
      mvz = pz + nz * toward;
      break;
    }
    case "cover": {
      if (!bot.coverPos) bot.coverPos = nearestCover(bot);
      const cx = bot.coverPos.x - bot.pos.x;
      const cz = bot.coverPos.z - bot.pos.z;
      const cd = Math.hypot(cx, cz) || 0.0001;
      if (cd > 0.7) {
        mvx = cx / cd;
        mvz = cz / cd;
      } else {
        // At cover: peek-and-hide rhythm.
        bot.crouching = Math.floor(now / 850) % 2 === 0;
      }
      break;
    }
    case "harass": {
      // Shoot and fall back: keep facing the target while backpedalling,
      // sliding sideways so the retreat isn't a straight line.
      const px = -nz * bot.strafeDir;
      const pz = nx * bot.strafeDir;
      if (d < range * 0.85) {
        mvx = -nx * 0.8 + px * 0.5;
        mvz = -nz * 0.8 + pz * 0.5;
      } else {
        mvx = px;
        mvz = pz;
      }
      break;
    }
    case "retreat":
      mvx = -nx;
      mvz = -nz;
      break;
  }

  const speed = 3 * bot.personality.speed;
  const ml = Math.hypot(mvx, mvz);
  if (ml > 0.01) {
    mvx /= ml;
    mvz /= ml;
    bot.pos.x += mvx * speed * dt;
    bot.pos.z += mvz * speed * dt;
    bot.moving = true;
  }
  bot.pos.x = clamp(bot.pos.x, -ARENA, ARENA);
  bot.pos.z = clamp(bot.pos.z, -ARENA, ARENA);

  // Jump only when it matters: a dodge-hop while actually being shot at.
  const underFire = alive.some(
    (e) => e.target === bot.id && e.shooting && dist(e.pos, bot.pos) < fireRange(e)
  );
  if (bot.pos.y <= 0.001 && now - bot.lastJumpAt > 4000 && underFire && Math.random() < 0.05) {
    bot.vy = 6.6;
    bot.lastJumpAt = now;
  }

  // Fire when in range and not hiding behind cover.
  const hidden = bot.intent === "cover" && bot.crouching;
  bot.shooting = d < range && !hidden && bot.pos.y < 1.2;
  if (bot.shooting && now - bot.lastShootAt > bot.personality.fireRate) {
    bot.lastShootAt = now;
    onShoot(bot, target);
  }

  bot.anim = pickAnim(bot);
}

/** Serialize the live bots into a compact array the host broadcasts. */
export function snapshotBots(bots: BotState[]): BotSnap[] {
  return bots.map((b) => ({
    x: +b.pos.x.toFixed(3),
    y: +b.pos.y.toFixed(3),
    z: +b.pos.z.toFixed(3),
    a: +b.angle.toFixed(3),
    h: Math.round(b.health),
    d: b.dead ? 1 : 0,
    t: b.target,
    an: b.anim,
    k: b.kills,
  }));
}

/** Apply a received snapshot to local bots, smoothing position/angle for clients. */
export function applyBotSnapshot(bots: BotState[], snap: BotSnap[], smoothing: number) {
  if (!Array.isArray(snap)) return;
  snap.forEach((s, i) => {
    const bot = bots[i];
    if (!bot || !s) return;
    bot.pos.x += (s.x - bot.pos.x) * smoothing;
    bot.pos.z += (s.z - bot.pos.z) * smoothing;
    bot.pos.y += (s.y - bot.pos.y) * Math.min(1, smoothing * 2);
    bot.angle = lerpAngle(bot.angle, s.a, smoothing);
    bot.health = s.h;
    bot.dead = s.d === 1;
    bot.target = s.t;
    bot.anim = s.an;
    bot.kills = s.k;
    bot.moving = s.an === "Run" || s.an === "Run_Gun";
    bot.shooting = s.an === "Idle_Shoot" || s.an === "Run_Gun";
  });
}

function lerpAngle(from: number, to: number, t: number) {
  let diff = to - from;
  while (diff < -Math.PI) diff += Math.PI * 2;
  while (diff > Math.PI) diff -= Math.PI * 2;
  return from + diff * t;
}
