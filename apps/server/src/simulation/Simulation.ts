import { randomInt } from 'node:crypto';
import { CHARACTERS, DIFFICULTIES, GAME, weaponCooldown, weaponDamage, type CharacterId, type DifficultyId, type ElementId, type MapId, type MonsterKind, type RoleId, type WeaponId } from '@wse/shared';
import { MAP_MONSTER_POOLS, MONSTER_RULES, WEAPON_RULES } from '../config/combat.js';
import { GameState, Player, Monster, Projectile, Gem } from '../schema/GameState.js';
import { applyCombinations, awardXp, upgradeLevel } from '../systems/Progression.js';

type Vec = { x: number; y: number };
type BulletData = { vx: number; vy: number; ttl: number; damage: number; radius: number; element?: ElementId; hits: Set<string>; hitReset: number; bounces: number; area: boolean };
const distance = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.y - b.y);
const distanceToSegment = (point: Vec, start: Vec, end: Vec) => {
  const dx = end.x - start.x; const dy = end.y - start.y;
  const t = dx === 0 && dy === 0 ? 0 : clamp(((point.x - start.x) * dx + (point.y - start.y) * dy) / (dx * dx + dy * dy), 0, 1);
  return Math.hypot(point.x - (start.x + t * dx), point.y - (start.y + t * dy));
};
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

export class Simulation {
  readonly input = new Map<string, Vec>();
  readonly aim = new Map<string, Vec>();
  private bulletData = new Map<string, BulletData>();
  private nextId = 0;
  private elapsed = 0;
  private spawnClock = 0;
  private attackClock = new Map<string, number>();
  private hitClock = new Map<string, number>();
  private invulnerableUntil = new Map<string, number>();
  private effects = new Map<string, { burnUntil: number; burnTick: number; slowUntil: number; stunUntil: number; weakenUntil: number }>();

  constructor(private state: GameState) {}

  removePlayer(id: string): void {
    this.input.delete(id); this.aim.delete(id); this.invulnerableUntil.delete(id);
    for (const key of this.attackClock.keys()) if (key.startsWith(`${id}:`)) this.attackClock.delete(key);
  }

  tick(): void {
    if (this.state.phase !== 'running') return;
    const dt = GAME.tickMs / 1000;
    const difficulty = DIFFICULTIES[this.state.difficulty as DifficultyId] ?? DIFFICULTIES.normal;
    this.elapsed += GAME.tickMs;
    this.state.elapsedMs = this.elapsed;

    for (const [id, player] of this.state.players) {
      if (!player.alive || player.pendingUpgrade || player.pendingEvolution) continue;
      if (upgradeLevel(player, 'ward') > 0 && this.elapsed >= 30000 && this.elapsed % 30000 < 3000) player.invulnerableUntil = Math.max(player.invulnerableUntil, this.elapsed + GAME.tickMs);
      const v = this.input.get(id) ?? { x: 0, y: 0 };
      const character = CHARACTERS[player.character as CharacterId] ?? CHARACTERS.guardian;
      const speed = character.speed * (1 + 0.12 * upgradeLevel(player, 'haste') + 0.08 * upgradeLevel(player, 'speed'));
      player.x = clamp(player.x + v.x * speed * dt, GAME.playerRadius, GAME.width - GAME.playerRadius);
      player.y = clamp(player.y + v.y * speed * dt, GAME.playerRadius, GAME.height - GAME.playerRadius);
      const target = this.nearestMonster(player);
      for (const [weapon, level] of player.upgrades) {
        if (level <= 0 || !Object.hasOwn(WEAPON_RULES, weapon)) continue;
        const weaponId = weapon as WeaponId;
        const clockKey = `${id}:${weaponId}`;
        if (this.elapsed < (this.attackClock.get(clockKey) ?? 0)) continue;
        const interval = weaponCooldown(weaponId, player.role as RoleId, upgradeLevel(player, 'cadence'), player.evolutions.get(weapon));
        this.attackClock.set(clockKey, this.elapsed + interval);
        this.fireWeapon(id, player, target?.[1], weaponId, level);
      }
      applyCombinations(player);
    }

    this.spawnClock += GAME.tickMs;
    const spawnInterval = Math.max(350, (GAME.spawnMs - Math.floor(this.elapsed / 15000) * 80) * difficulty.spawn);
    if (this.spawnClock >= spawnInterval && this.state.monsters.size < GAME.maxMonsters) { this.spawnClock = 0; this.spawnMonster(difficulty.monsterHp); }

    for (const [id, monster] of this.state.monsters) {
      const target = this.nearestPlayer(monster);
      if (!target) continue;
      const rule = MONSTER_RULES[monster.kind as MonsterKind] ?? MONSTER_RULES.grunt;
      const effect = this.effects.get(id);
      if (effect && effect.burnUntil > this.elapsed && effect.burnTick <= this.elapsed) { effect.burnTick = this.elapsed + 500; this.damageMonster(id, monster, 2); if (!this.state.monsters.has(id)) continue; }
      if (effect && effect.stunUntil > this.elapsed) continue;
      const d = distance(monster, target[1]);
      const slow = effect && effect.slowUntil > this.elapsed ? 0.55 : 1;
      if (monster.kind === 'ranger') {
        if (d > 220) { monster.x += (target[1].x - monster.x) / d * rule.speed * difficulty.monsterSpeed * slow * dt; monster.y += (target[1].y - monster.y) / d * rule.speed * difficulty.monsterSpeed * slow * dt; }
        if (d < 420 && this.elapsed >= (this.hitClock.get(id) ?? 0)) {
          this.hitClock.set(id, this.elapsed + 1800);
          const angle = Math.atan2(target[1].y - monster.y, target[1].x - monster.x);
          this.createBullet(monster, 'monster', 'enemy', angle, 250, 2000, rule.damage * difficulty.monsterDamage * (effect && effect.weakenUntil > this.elapsed ? 0.85 : 1), 7);
        }
      } else if (d > rule.radius + GAME.playerRadius - 4) {
        const dash = monster.kind === 'charger' && this.elapsed % 3200 < 450 && d < 300 ? 5 : 1;
        monster.x += (target[1].x - monster.x) / d * rule.speed * difficulty.monsterSpeed * slow * dash * dt;
        monster.y += (target[1].y - monster.y) / d * rule.speed * difficulty.monsterSpeed * slow * dash * dt;
      } else if (this.elapsed >= (this.hitClock.get(id) ?? 0) && this.elapsed >= (this.invulnerableUntil.get(target[0]) ?? 0)) {
        const damage = rule.damage * difficulty.monsterDamage * (effect && effect.weakenUntil > this.elapsed ? 0.85 : 1);
        this.damagePlayer(target[0], target[1], damage);
        this.hitClock.set(id, this.elapsed + GAME.monsterHitMs);
      }
    }

    for (const [id, bullet] of this.state.projectiles) {
      const data = this.bulletData.get(id);
      if (!data) { this.state.projectiles.delete(id); continue; }
      const previous = { x: bullet.x, y: bullet.y };
      bullet.x += data.vx * dt; bullet.y += data.vy * dt; data.ttl -= GAME.tickMs;
      if (data.area && this.elapsed >= data.hitReset) { data.hits.clear(); data.hitReset = this.elapsed + 500; }
      if (bullet.owner === 'enemy') {
        const hit = [...this.state.players].find(([playerId, player]) => player.alive && this.elapsed >= (this.invulnerableUntil.get(playerId) ?? 0) && distanceToSegment(player, previous, bullet) < GAME.playerRadius + data.radius);
        if (hit) { this.damagePlayer(hit[0], hit[1], data.damage); this.removeBullet(id); }
      } else {
        for (const [monsterId, monster] of this.state.monsters) {
          if (data.hits.has(monsterId) || distanceToSegment(monster, previous, bullet) >= data.radius + (MONSTER_RULES[monster.kind as MonsterKind] ?? MONSTER_RULES.grunt).radius) continue;
          data.hits.add(monsterId);
          this.damageMonster(monsterId, monster, data.damage, data.element);
          const owner = this.state.players.get(bullet.owner);
          if (bullet.weapon === 'pet' && owner?.evolutions.get('pet') === 'T') this.areaDamage(bullet, 42, data.damage * 0.5, data.element);
          if (bullet.weapon === 'bounce' && owner?.evolutions.get('bounce') === 'T') this.areaDamage(bullet, 42, data.damage * 0.5, data.element);
          if (!data.area) {
            if (data.bounces > 0) {
              data.bounces--;
              const next = [...this.state.monsters].find(([otherId]) => !data.hits.has(otherId));
              if (next) { const angle = Math.atan2(next[1].y - bullet.y, next[1].x - bullet.x); data.vx = Math.cos(angle) * 420; data.vy = Math.sin(angle) * 420; break; }
            }
            this.removeBullet(id); break;
          }
        }
        const owner = this.state.players.get(bullet.owner);
        if (owner?.role === 'support' && this.state.projectiles.has(id)) {
          for (const [allyId, ally] of this.state.players) {
            if (allyId === bullet.owner || !ally.alive || data.hits.has(`ally:${allyId}`) || distanceToSegment(ally, previous, bullet) >= GAME.playerRadius + data.radius) continue;
            ally.hp = Math.min(ally.maxHp, ally.hp + Math.max(1, Math.round(data.damage * 0.7)));
            data.hits.add(`ally:${allyId}`);
            if (!data.area) { this.removeBullet(id); break; }
          }
        }
      }
      if (data.ttl <= 0 || bullet.x < 0 || bullet.x > GAME.width || bullet.y < 0 || bullet.y > GAME.height) this.removeBullet(id);
    }

    for (const [id, gem] of this.state.gems) {
      for (const player of this.state.players.values()) {
        const pickupRadius = GAME.gemRadius + GAME.playerRadius + upgradeLevel(player, 'magnet') * 25;
        if (player.alive && distance(gem, player) < pickupRadius) { awardXp(player, Math.round(gem.xp * (1 + (player.role === 'luck' ? 0.1 : 0) + upgradeLevel(player, 'fortune') * 0.1) * 10) / 10); this.state.gems.delete(id); break; }
      }
    }
    if (this.state.players.size > 0 && [...this.state.players.values()].every(player => !player.alive)) this.state.phase = 'defeat';
  }

  private fireWeapon(ownerId: string, player: Player, target: Monster | undefined, weapon: WeaponId, level: number): void {
    const rule = WEAPON_RULES[weapon];
    const aim = this.aim.get(ownerId) ?? { x: 1, y: 0 };
    const baseAngle = Math.atan2(aim.y, aim.x);
    const autoAngle = target ? Math.atan2(target.y - player.y, target.x - player.x) : baseAngle;
    const character = CHARACTERS[player.character as CharacterId] ?? CHARACTERS.guardian;
    const branch = player.evolutions.get(weapon);
    const damage = weaponDamage(weapon, level, character.damage, player.role as RoleId, upgradeLevel(player, 'force'), branch);
    const element: Partial<Record<WeaponId, ElementId>> = { orbit: 'lightning', trail: 'fire', pet: 'water', meteor: 'fire', slowfield: 'water', bounce: 'lightning', cannon: 'fire' };
    if (weapon === 'basic' && character.style === 'melee') {
      player.meleeAttackAt = this.elapsed;
      player.meleeAttackAngle = baseAngle;
      for (const [id, monster] of this.state.monsters) if (distance(monster, player) < 75 && Math.cos(Math.atan2(monster.y - player.y, monster.x - player.x) - baseAngle) > 0.35) this.damageMonster(id, monster, damage);
      if (player.role === 'support') for (const [id, ally] of this.state.players) if (id !== ownerId && ally.alive && distance(ally, player) < 75) ally.hp = Math.min(ally.maxHp, ally.hp + Math.round(damage * 0.7));
      return;
    }
    if (weapon === 'trail') {
      if (Math.hypot(this.input.get(ownerId)?.x ?? 0, this.input.get(ownerId)?.y ?? 0) > 0.1) this.createBullet(player, weapon, ownerId, 0, 0, rule.life * (branch === 'F' ? 1.5 : 1), damage, rule.radius + level * (branch === 'F' ? 5 : 2), element[weapon], 0, true);
      return;
    }
    if (weapon === 'orbit') {
      for (let i = 0; i < Math.min(11, level + 1); i++) {
        const angle = this.elapsed * (branch === 'F' ? 0.007 : 0.004) + i * Math.PI * 2 / (level + 1);
        this.createBullet({ x: player.x + Math.cos(angle) * 65, y: player.y + Math.sin(angle) * 65 }, weapon, ownerId, 0, 0, 450, damage, rule.radius * (branch === 'T' ? 1.5 : 1), element[weapon], 0, true);
      }
      return;
    }
    if (weapon === 'slowfield') {
      for (const [id, monster] of this.state.monsters) if (distance(player, monster) < rule.radius + level * 10) {
        this.applyElement(id, 'water');
        if (branch === 'F') { const effect = this.effects.get(id); if (effect) effect.weakenUntil = this.elapsed + 700; }
        if (branch === 'T') this.damageMonster(id, monster, damage, 'water');
      }
      return;
    }
    if (weapon === 'meteor') {
      const count = 1 + Math.floor(level / 3) + (branch === 'F' ? 2 : 0);
      for (let i = 0; i < count; i++) this.createBullet({ x: clamp(player.x + randomInt(-300, 301), 0, GAME.width), y: clamp(player.y + randomInt(-220, 221), 0, GAME.height) }, weapon, ownerId, 0, 0, rule.life * (branch === 'T' ? 3 : 1), damage, rule.radius, element[weapon], 0, true);
      return;
    }
    if ((weapon === 'pet' || weapon === 'bounce' || weapon === 'cannon') && !target) return;
    const count = weapon === 'pet' && branch === 'F' ? 3 : weapon === 'cannon' ? (branch === 'T' ? 8 : 1 + Math.floor(level / 4) + (branch === 'F' ? 2 : 0)) : 1;
    for (let i = 0; i < count; i++) {
      const angle = weapon === 'cannon' && branch === 'T' ? i * Math.PI * 2 / count : (weapon === 'basic' ? baseAngle : autoAngle) + (i - (count - 1) / 2) * 0.2;
      const source = weapon === 'pet' ? { x: player.x + 36, y: player.y - 30 } : player;
      this.createBullet(source, weapon, ownerId, angle, rule.speed, rule.life, damage, rule.radius, element[weapon], weapon === 'bounce' ? 1 + (branch === 'F' ? 2 : 0) : 0);
    }
  }

  private createBullet(pos: Vec, weapon: string, owner: string, angle: number, speed: number, ttl: number, damage: number, radius: number, element?: ElementId, bounces = 0, area = false): void {
    if (this.state.projectiles.size >= 150) return;
    const id = `${++this.nextId}`;
    const bullet = new Projectile(); bullet.x = pos.x; bullet.y = pos.y; bullet.weapon = weapon; bullet.owner = owner;
    this.state.projectiles.set(id, bullet);
    this.bulletData.set(id, { vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, ttl, damage, radius, element, hits: new Set(), hitReset: 0, bounces, area });
  }

  private removeBullet(id: string): void { this.state.projectiles.delete(id); this.bulletData.delete(id); }

  private damagePlayer(id: string, player: Player, damage: number): void {
    if (!player.alive || player.pendingUpgrade || player.pendingEvolution || this.elapsed < player.invulnerableUntil || this.elapsed < (this.invulnerableUntil.get(id) ?? 0)) return;
    if (upgradeLevel(player, 'ward') > 0 && this.elapsed >= 30000 && this.elapsed % 30000 < 3000) return;
    const finalDamage = Math.max(1, Math.round(damage * (player.role === 'defense' ? 0.85 : 1)) - upgradeLevel(player, 'armor') * 2);
    player.hp = Math.max(0, player.hp - finalDamage); player.alive = player.hp > 0;
    this.invulnerableUntil.set(id, this.elapsed + GAME.invulnerableMs);
  }

  private damageMonster(id: string, monster: Monster, damage: number, element?: ElementId): void {
    if (!this.state.monsters.has(id)) return;
    const modifiers: Record<MonsterKind, Partial<Record<ElementId, number>>> = { grunt: { fire: 1.2 }, ranger: { water: 1.2, lightning: 0.8 }, charger: { lightning: 1.2, fire: 0.8 } };
    const effect = this.effects.get(id);
    monster.hp = Math.max(0, monster.hp - Math.max(1, Math.round(damage * (element ? modifiers[monster.kind as MonsterKind]?.[element] ?? 1 : 1) * (effect && effect.weakenUntil > this.elapsed ? 1.15 : 1))));
    if (element) this.applyElement(id, element);
    if (monster.hp > 0) return;
    this.state.monsters.delete(id); this.state.kills++; this.hitClock.delete(id); this.effects.delete(id);
    const gem = new Gem(); gem.x = monster.x; gem.y = monster.y; gem.xp = MONSTER_RULES[monster.kind as MonsterKind]?.xp ?? GAME.gemXp;
    if (this.state.gems.size >= 200) this.state.gems.delete(this.state.gems.keys().next().value!);
    this.state.gems.set(`${++this.nextId}`, gem);
  }

  private applyElement(id: string, element: ElementId): void {
    const effect = this.effects.get(id) ?? { burnUntil: 0, burnTick: 0, slowUntil: 0, stunUntil: 0, weakenUntil: 0 };
    if (element === 'fire') { effect.burnUntil = this.elapsed + 2500; effect.burnTick = this.elapsed + 500; }
    if (element === 'water') effect.slowUntil = this.elapsed + 1800;
    if (element === 'lightning') effect.stunUntil = this.elapsed + 450;
    this.effects.set(id, effect);
  }

  private areaDamage(pos: Vec, radius: number, damage: number, element?: ElementId): void {
    for (const [id, monster] of this.state.monsters) if (distance(pos, monster) < radius) this.damageMonster(id, monster, damage, element);
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
    const pool = MAP_MONSTER_POOLS[this.state.map as MapId] ?? MAP_MONSTER_POOLS.ruins;
    const totalWeight = pool.reduce((sum, entry) => sum + entry.weight, 0);
    let roll = randomInt(totalWeight);
    const kind = pool.find(entry => { roll -= entry.weight; return roll < 0; })?.kind ?? 'grunt';
    const rule = MONSTER_RULES[kind];
    const players = [...this.state.players.values()].filter(player => player.alive);
    const anchor = players.length ? players[randomInt(players.length)] : { x: GAME.width / 2, y: GAME.height / 2 };
    const angle = Math.random() * Math.PI * 2;
    const monster = new Monster(); monster.kind = kind;
    monster.x = clamp(anchor.x + Math.cos(angle) * 440, 0, GAME.width);
    monster.y = clamp(anchor.y + Math.sin(angle) * 320, 0, GAME.height);
    monster.maxHp = Math.round((rule.hp + Math.floor(this.elapsed / 30000) * 5) * hpMultiplier);
    monster.hp = monster.maxHp;
    this.state.monsters.set(`${++this.nextId}`, monster);
  }
}
