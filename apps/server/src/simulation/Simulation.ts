import { randomInt } from 'node:crypto';
import { CHARACTERS, DIFFICULTIES, GAME, type CharacterId, type DifficultyId, type MonsterKind, type WeaponId } from '@wse/shared';
import { MONSTER_RULES, WEAPON_RULES } from '../config/combat.js';
import { GameState, Player, Monster, Projectile, Gem } from '../schema/GameState.js';
import { awardXp, upgradeLevel } from '../systems/Progression.js';

type Vec = { x: number; y: number };
type BulletData = { vx: number; vy: number; ttl: number; damage: number; radius: number };
const distance = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.y - b.y);
const distanceToSegment = (point: Vec, start: Vec, end: Vec) => {
  const dx = end.x - start.x; const dy = end.y - start.y;
  const t = dx === 0 && dy === 0 ? 0 : clamp(((point.x - start.x) * dx + (point.y - start.y) * dy) / (dx * dx + dy * dy), 0, 1);
  return Math.hypot(point.x - (start.x + t * dx), point.y - (start.y + t * dy));
};
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

export class Simulation {
  readonly input = new Map<string, Vec>();
  private bulletData = new Map<string, BulletData>();
  private nextId = 0;
  private elapsed = 0;
  private spawnClock = 0;
  private attackClock = new Map<string, number>();
  private hitClock = new Map<string, number>();
  private invulnerableUntil = new Map<string, number>();

  constructor(private state: GameState) {}

  removePlayer(id: string): void {
    this.input.delete(id); this.invulnerableUntil.delete(id);
    for (const key of this.attackClock.keys()) if (key.startsWith(`${id}:`)) this.attackClock.delete(key);
  }

  tick(): void {
    if (this.state.phase !== 'running') return;
    const dt = GAME.tickMs / 1000;
    const difficulty = DIFFICULTIES[this.state.difficulty as DifficultyId] ?? DIFFICULTIES.normal;
    this.elapsed += GAME.tickMs;
    this.state.elapsedMs = this.elapsed;

    for (const [id, player] of this.state.players) {
      if (!player.alive || player.pendingUpgrade) continue;
      const v = this.input.get(id) ?? { x: 0, y: 0 };
      const character = CHARACTERS[player.character as CharacterId] ?? CHARACTERS.guardian;
      const speed = character.speed * (1 + 0.12 * upgradeLevel(player, 'haste'));
      player.x = clamp(player.x + v.x * speed * dt, GAME.playerRadius, GAME.width - GAME.playerRadius);
      player.y = clamp(player.y + v.y * speed * dt, GAME.playerRadius, GAME.height - GAME.playerRadius);
      const target = this.nearestMonster(player);
      if (!target) continue;
      for (const [weapon, level] of player.upgrades) {
        if (level <= 0 || !(weapon in WEAPON_RULES)) continue;
        const weaponId = weapon as WeaponId;
        const rule = WEAPON_RULES[weaponId];
        const clockKey = `${id}:${weaponId}`;
        if (this.elapsed < (this.attackClock.get(clockKey) ?? 0)) continue;
        const interval = Math.max(150, rule.cooldown * Math.pow(0.88, upgradeLevel(player, 'cadence')));
        this.attackClock.set(clockKey, this.elapsed + interval);
        this.fireWeapon(player, target[1], weaponId, level);
      }
    }

    this.spawnClock += GAME.tickMs;
    const spawnInterval = Math.max(350, (GAME.spawnMs - Math.floor(this.elapsed / 15000) * 80) * difficulty.spawn);
    if (this.spawnClock >= spawnInterval && this.state.monsters.size < GAME.maxMonsters) { this.spawnClock = 0; this.spawnMonster(difficulty.monsterHp); }

    for (const [id, monster] of this.state.monsters) {
      const target = this.nearestPlayer(monster);
      if (!target) continue;
      const rule = MONSTER_RULES[monster.kind as MonsterKind] ?? MONSTER_RULES.grunt;
      const d = distance(monster, target[1]);
      if (d > rule.radius + GAME.playerRadius - 4) {
        monster.x += (target[1].x - monster.x) / d * rule.speed * difficulty.monsterSpeed * dt;
        monster.y += (target[1].y - monster.y) / d * rule.speed * difficulty.monsterSpeed * dt;
      } else if (this.elapsed >= (this.hitClock.get(id) ?? 0) && this.elapsed >= (this.invulnerableUntil.get(target[0]) ?? 0)) {
        const armor = upgradeLevel(target[1], 'armor');
        const damage = Math.max(1, Math.round(rule.damage * difficulty.monsterDamage) - armor * 2);
        target[1].hp = Math.max(0, target[1].hp - damage);
        target[1].alive = target[1].hp > 0;
        this.hitClock.set(id, this.elapsed + GAME.monsterHitMs);
        this.invulnerableUntil.set(target[0], this.elapsed + GAME.invulnerableMs);
      }
    }

    for (const [id, bullet] of this.state.projectiles) {
      const data = this.bulletData.get(id);
      if (!data) { this.state.projectiles.delete(id); continue; }
      const previous = { x: bullet.x, y: bullet.y };
      bullet.x += data.vx * dt; bullet.y += data.vy * dt; data.ttl -= GAME.tickMs;
      const hit = [...this.state.monsters].find(([, monster]) => distanceToSegment(monster, previous, bullet) < data.radius + (MONSTER_RULES[monster.kind as MonsterKind] ?? MONSTER_RULES.grunt).radius);
      if (hit) {
        const [monsterId, monster] = hit;
        monster.hp = Math.max(0, monster.hp - data.damage);
        if (monster.hp === 0) {
          this.state.monsters.delete(monsterId); this.state.kills += 1; this.hitClock.delete(monsterId);
          const gem = new Gem(); gem.x = monster.x; gem.y = monster.y; gem.xp = (MONSTER_RULES[monster.kind as MonsterKind] ?? MONSTER_RULES.grunt).xp;
          this.state.gems.set(`${++this.nextId}`, gem);
        }
        this.state.projectiles.delete(id); this.bulletData.delete(id);
      } else if (data.ttl <= 0 || bullet.x < 0 || bullet.x > GAME.width || bullet.y < 0 || bullet.y > GAME.height) {
        this.state.projectiles.delete(id); this.bulletData.delete(id);
      }
    }

    for (const [id, gem] of this.state.gems) {
      for (const player of this.state.players.values()) {
        const pickupRadius = GAME.gemRadius + GAME.playerRadius + upgradeLevel(player, 'magnet') * 25;
        if (player.alive && distance(gem, player) < pickupRadius) { awardXp(player, gem.xp); this.state.gems.delete(id); break; }
      }
    }
    if (this.state.players.size > 0 && [...this.state.players.values()].every(player => !player.alive)) this.state.phase = 'defeat';
  }

  private fireWeapon(player: Player, target: Monster, weapon: WeaponId, level: number): void {
    const rule = WEAPON_RULES[weapon];
    const baseAngle = Math.atan2(target.y - player.y, target.x - player.x);
    const count = weapon === 'spread' ? rule.count + Math.floor((level - 1) / 2) : weapon === 'nova' ? rule.count + (level - 1) * 2 : weapon === 'pulse' ? rule.count + Math.floor((level - 1) / 3) : rule.count;
    const character = CHARACTERS[player.character as CharacterId] ?? CHARACTERS.guardian;
    const damage = Math.round((rule.damage + character.damage - 10) * (1 + 0.25 * (level - 1)) * (1 + 0.15 * upgradeLevel(player, 'force')));
    for (let i = 0; i < count; i++) {
      const angle = rule.mode === 'radial' ? i * Math.PI * 2 / count : baseAngle + (i - (count - 1) / 2) * (rule.mode === 'spread' ? 0.23 : 0.12);
      const bullet = new Projectile(); bullet.x = player.x; bullet.y = player.y; bullet.weapon = weapon;
      const id = `${++this.nextId}`;
      this.state.projectiles.set(id, bullet);
      this.bulletData.set(id, { vx: Math.cos(angle) * rule.speed, vy: Math.sin(angle) * rule.speed, ttl: rule.life, damage, radius: rule.radius + (weapon === 'ember' ? Math.floor((level - 1) / 2) : 0) });
    }
  }

  private nearestPlayer(pos: Vec): [string, Player] | undefined {
    let best: [string, Player] | undefined; let bestD = Infinity;
    for (const [id, player] of this.state.players) { if (!player.alive) continue; const d = distance(pos, player); if (d < bestD) { best = [id, player]; bestD = d; } }
    return best;
  }

  private nearestMonster(pos: Vec): [string, Monster] | undefined {
    let best: [string, Monster] | undefined; let bestD = Infinity;
    for (const entry of this.state.monsters) { const d = distance(pos, entry[1]); if (d < bestD) { best = entry; bestD = d; } }
    return best;
  }

  private spawnMonster(hpMultiplier: number): void {
    const roll = randomInt(100);
    const kind: MonsterKind = roll < 55 ? 'grunt' : roll < 82 ? 'runner' : 'brute';
    const rule = MONSTER_RULES[kind];
    const side = randomInt(4);
    const monster = new Monster(); monster.kind = kind;
    monster.x = side === 0 ? 0 : side === 1 ? GAME.width : Math.random() * GAME.width;
    monster.y = side === 2 ? 0 : side === 3 ? GAME.height : Math.random() * GAME.height;
    monster.maxHp = Math.round((rule.hp + Math.floor(this.elapsed / 30000) * 5) * hpMultiplier);
    monster.hp = monster.maxHp;
    this.state.monsters.set(`${++this.nextId}`, monster);
  }
}
