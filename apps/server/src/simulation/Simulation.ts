import { CHARACTERS, DIFFICULTIES, GAME, type CharacterId, type DifficultyId } from '@wse/shared';
import { GameState, Player, Monster, Projectile, Gem } from '../schema/GameState.js';
type Vec = { x: number; y: number };
type BulletData = Vec & { vx: number; vy: number; ttl: number; damage: number };
const distance = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.y - b.y);
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
  removePlayer(id: string): void { this.input.delete(id); this.attackClock.delete(id); this.invulnerableUntil.delete(id); }
  tick(): void {
    if (this.state.phase !== 'running') return;
    const dt = GAME.tickMs / 1000;
    const difficulty = DIFFICULTIES[this.state.difficulty as DifficultyId] ?? DIFFICULTIES.normal;
    this.elapsed += GAME.tickMs;
    for (const [id, player] of this.state.players) {
      if (!player.alive) continue;
      const v = this.input.get(id) ?? { x: 0, y: 0 };
      const character = CHARACTERS[player.character as CharacterId] ?? CHARACTERS.guardian;
      player.x = clamp(player.x + v.x * character.speed * dt, GAME.playerRadius, GAME.width - GAME.playerRadius);
      player.y = clamp(player.y + v.y * character.speed * dt, GAME.playerRadius, GAME.height - GAME.playerRadius);
      const nearest = this.nearestMonster(player);
      if (nearest && this.elapsed >= (this.attackClock.get(id) ?? 0)) {
        this.attackClock.set(id, this.elapsed + GAME.attackMs);
        const [, target] = nearest;
        const d = Math.max(distance(player, target), 0.001);
        const bullet = new Projectile(); bullet.x = player.x; bullet.y = player.y;
        const bulletId = `${++this.nextId}`;
        this.state.projectiles.set(bulletId, bullet);
        this.bulletData.set(bulletId, { x: bullet.x, y: bullet.y, vx: (target.x - player.x) / d * GAME.projectileSpeed, vy: (target.y - player.y) / d * GAME.projectileSpeed, ttl: GAME.projectileLifeMs, damage: character.damage });
      }
    }
    this.spawnClock += GAME.tickMs;
    const spawnInterval = Math.max(350, (GAME.spawnMs - Math.floor(this.elapsed / 15000) * 80) * difficulty.spawn);
    if (this.spawnClock >= spawnInterval && this.state.monsters.size < GAME.maxMonsters) { this.spawnClock = 0; this.spawnMonster(difficulty.monsterHp); }
    for (const [id, monster] of this.state.monsters) {
      const target = this.nearestPlayer(monster);
      if (!target) continue;
      const d = distance(monster, target[1]);
      if (d > GAME.monsterRadius + GAME.playerRadius - 4) {
        monster.x += (target[1].x - monster.x) / d * GAME.monsterSpeed * difficulty.monsterSpeed * dt;
        monster.y += (target[1].y - monster.y) / d * GAME.monsterSpeed * difficulty.monsterSpeed * dt;
      } else if (this.elapsed >= (this.hitClock.get(id) ?? 0) && this.elapsed >= (this.invulnerableUntil.get(target[0]) ?? 0)) {
        target[1].hp = Math.max(0, target[1].hp - Math.round(GAME.monsterDamage * difficulty.monsterDamage));
        target[1].alive = target[1].hp > 0;
        this.hitClock.set(id, this.elapsed + GAME.monsterHitMs);
        this.invulnerableUntil.set(target[0], this.elapsed + GAME.invulnerableMs);
      }
    }
    for (const [id, bullet] of this.state.projectiles) {
      const data = this.bulletData.get(id);
      if (!data) { this.state.projectiles.delete(id); continue; }
      data.x += data.vx * dt; data.y += data.vy * dt; data.ttl -= GAME.tickMs;
      bullet.x = data.x; bullet.y = data.y;
      const hit = [...this.state.monsters].find(([, m]) => distance(bullet, m) < GAME.projectileRadius + GAME.monsterRadius);
      if (hit) {
        const [monsterId, monster] = hit;
        monster.hp = Math.max(0, monster.hp - data.damage);
        if (monster.hp === 0) { this.state.monsters.delete(monsterId); this.hitClock.delete(monsterId); const gem = new Gem(); gem.x = monster.x; gem.y = monster.y; this.state.gems.set(`${++this.nextId}`, gem); }
        this.state.projectiles.delete(id); this.bulletData.delete(id);
      } else if (data.ttl <= 0 || data.x < 0 || data.x > GAME.width || data.y < 0 || data.y > GAME.height) { this.state.projectiles.delete(id); this.bulletData.delete(id); }
    }
    for (const [id, gem] of this.state.gems) {
      for (const player of this.state.players.values()) {
        if (player.alive && distance(gem, player) < GAME.gemRadius + GAME.playerRadius) { player.xp += GAME.gemXp; this.state.gems.delete(id); break; }
      }
    }
    if (this.state.players.size > 0 && [...this.state.players.values()].every(p => !p.alive)) this.state.phase = 'defeat';
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
    const side = Math.floor(Math.random() * 4);
    const monster = new Monster();
    monster.x = side === 0 ? 0 : side === 1 ? GAME.width : Math.random() * GAME.width;
    monster.y = side === 2 ? 0 : side === 3 ? GAME.height : Math.random() * GAME.height;
    monster.maxHp = Math.round((GAME.monsterHp + Math.floor(this.elapsed / 30000) * 5) * hpMultiplier);
    monster.hp = monster.maxHp;
    this.state.monsters.set(`${++this.nextId}`, monster);
  }
}
