export type Intent = "attack" | "retreat" | "flank" | "idle";

export interface AgentPersonality {
  name: string;
  color: string;
  aggression: number;   // 0-1: how aggressive
  retreatThreshold: number; // health % to start retreating
  speed: number;
  fireRate: number;     // ms between shots
  weapon: string;
}

export const AGENT_PERSONALITIES: AgentPersonality[] = [
  {
    name: "ALPHA",
    color: "#ef4444",
    aggression: 0.9,
    retreatThreshold: 15,
    speed: 1.1,
    fireRate: 300,
    weapon: "AK",
  },
  {
    name: "BETA",
    color: "#3b82f6",
    aggression: 0.5,
    retreatThreshold: 40,
    speed: 0.9,
    fireRate: 500,
    weapon: "Sniper",
  },
  {
    name: "GAMMA",
    color: "#22c55e",
    aggression: 0.7,
    retreatThreshold: 25,
    speed: 1.2,
    fireRate: 400,
    weapon: "SMG",
  },
];

export interface BotState {
  id: number;
  personality: AgentPersonality;
  health: number;
  intent: Intent;
  lastThinkAt: number;
  lastShootAt: number;
  pos: { x: number; y: number; z: number };
  angle: number;
  dead: boolean;
  moving: boolean;
  shooting: boolean;
  target: number; // index of the enemy this bot is currently engaging
}

/** Compact, network-friendly snapshot the host broadcasts each tick. */
export interface BotSnap {
  x: number;
  z: number;
  a: number; // angle
  h: number; // health
  d: 0 | 1; // dead
  m: 0 | 1; // moving
  s: 0 | 1; // shooting
  t: number; // target index
}

export function createBots(): BotState[] {
  return AGENT_PERSONALITIES.map((p, i) => ({
    id: i,
    personality: p,
    health: 100,
    intent: "idle",
    lastThinkAt: 0,
    lastShootAt: 0,
    pos: getSpawnPosition(i),
    angle: 0,
    dead: false,
    moving: false,
    shooting: false,
    target: (i + 1) % AGENT_PERSONALITIES.length,
  }));
}

/** Serialize the live bots into a compact array the host broadcasts. */
export function snapshotBots(bots: BotState[]): BotSnap[] {
  return bots.map((b) => ({
    x: +b.pos.x.toFixed(3),
    z: +b.pos.z.toFixed(3),
    a: +b.angle.toFixed(3),
    h: Math.round(b.health),
    d: b.dead ? 1 : 0,
    m: b.moving ? 1 : 0,
    s: b.shooting ? 1 : 0,
    t: b.target,
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
    bot.angle = lerpAngle(bot.angle, s.a, smoothing);
    bot.health = s.h;
    bot.dead = s.d === 1;
    bot.moving = s.m === 1;
    bot.shooting = s.s === 1;
    bot.target = s.t;
  });
}

function lerpAngle(from: number, to: number, t: number) {
  let diff = to - from;
  while (diff < -Math.PI) diff += Math.PI * 2;
  while (diff > Math.PI) diff -= Math.PI * 2;
  return from + diff * t;
}

export function botAnimation(bot: BotState): string {
  if (bot.dead) return "Death";
  if (bot.moving) return "Run_Gun";
  if (bot.shooting) return "Idle_Shoot";
  return "Idle";
}

function getSpawnPosition(id: number) {
  const spawns = [
    { x: -8, y: 0, z: -8 },
    { x: 8, y: 0, z: -8 },
    { x: 0, y: 0, z: 8 },
  ];
  return spawns[id];
}

export function thinkBot(bot: BotState, enemies: BotState[]): Intent {
  const alive = enemies.filter((e) => !e.dead);
  if (alive.length === 0) return "idle";

  const nearestDist = Math.min(
    ...alive.map((e) => dist(bot.pos, e.pos))
  );

  if (bot.health < bot.personality.retreatThreshold) return "retreat";
  if (nearestDist < 4 && bot.personality.aggression < 0.6) return "flank";
  if (Math.random() < bot.personality.aggression) return "attack";
  return "flank";
}

export function tickBot(
  bot: BotState,
  enemies: BotState[],
  dt: number,
  now: number,
  onShoot: (from: BotState, target: BotState) => void
) {
  if (bot.dead) return;

  const alive = enemies.filter((e) => !e.dead);
  if (alive.length === 0) return;

  // Re-think every 2 seconds
  if (now - bot.lastThinkAt > 2000) {
    bot.intent = thinkBot(bot, alive);
    bot.lastThinkAt = now;
  }

  const target = getNearestEnemy(bot, alive);
  if (!target) return;
  bot.target = target.id;

  const SPEED = 3 * bot.personality.speed;
  const dx = target.pos.x - bot.pos.x;
  const dz = target.pos.z - bot.pos.z;
  const d = Math.sqrt(dx * dx + dz * dz);

  // Face target
  bot.angle = Math.atan2(dx, dz);
  bot.moving = false;

  if (bot.intent === "attack" || bot.intent === "flank") {
    if (d > 3) {
      bot.pos.x += (dx / d) * SPEED * dt;
      bot.pos.z += (dz / d) * SPEED * dt;
      bot.moving = true;
    }
  } else if (bot.intent === "retreat") {
    bot.pos.x -= (dx / d) * SPEED * dt * 0.8;
    bot.pos.z -= (dz / d) * SPEED * dt * 0.8;
    bot.moving = true;
  }

  // Keep agents inside the playable area
  bot.pos.x = Math.max(-10, Math.min(10, bot.pos.x));
  bot.pos.z = Math.max(-10, Math.min(10, bot.pos.z));

  // Shoot if in range and cooled down
  const WEAPON_RANGE = bot.personality.weapon === "Sniper" ? 20 : 12;
  bot.shooting = d < WEAPON_RANGE;
  if (d < WEAPON_RANGE && now - bot.lastShootAt > bot.personality.fireRate) {
    bot.lastShootAt = now;
    onShoot(bot, target);
  }
}

function dist(a: { x: number; z: number }, b: { x: number; z: number }) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.z - b.z) ** 2);
}

function getNearestEnemy(bot: BotState, enemies: BotState[]) {
  return enemies.reduce<BotState | null>((nearest, e) => {
    if (!nearest) return e;
    return dist(bot.pos, e.pos) < dist(bot.pos, nearest.pos) ? e : nearest;
  }, null);
}
