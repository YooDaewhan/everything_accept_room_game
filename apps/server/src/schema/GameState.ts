import { Schema, MapSchema, type } from '@colyseus/schema';
import { GAME } from '@wse/shared';
export class Player extends Schema {
  @type('string') nickname = '';
  @type('string') character = 'guardian';
  @type('string') role = 'assault';
  @type('number') x = 0;
  @type('number') y = 0;
  @type('number') hp: number = GAME.playerHp;
  @type('number') maxHp: number = GAME.playerHp;
  @type('number') xp = 0;
  @type('number') xpToNext = 20;
  @type('number') level = 1;
  @type('boolean') pendingUpgrade = false;
  @type('string') pendingEvolution = '';
  @type('string') choice0 = '';
  @type('string') choice1 = '';
  @type('string') choice2 = '';
  @type({ map: 'number' }) upgrades = new MapSchema<number>();
  @type({ map: 'string' }) evolutions = new MapSchema<string>();
  @type('number') invulnerableUntil = 0;
  @type('number') meleeAttackAt = 0;
  @type('number') meleeAttackAngle = 0;
  @type('boolean') alive = true;
  constructor() { super(); this.upgrades.set('basic', 1); }
}
export class Monster extends Schema {
  @type('string') kind = 'grunt';
  @type('number') x = 0; @type('number') y = 0;
  @type('number') hp: number = GAME.monsterHp; @type('number') maxHp: number = GAME.monsterHp;
}
export class Projectile extends Schema {
  @type('string') weapon = 'basic';
  @type('string') owner = '';
  @type('number') x = 0; @type('number') y = 0;
}
export class Gem extends Schema {
  @type('number') x = 0; @type('number') y = 0;
  @type('number') xp: number = GAME.gemXp;
}
export class GameState extends Schema {
  @type('string') code = '';
  @type('string') title = '서바이버즈 방';
  @type('boolean') locked = false;
  @type('string') phase = 'lobby';
  @type('string') hostId = '';
  @type('string') map = 'ruins';
  @type('string') difficulty = 'normal';
  @type('number') elapsedMs = 0;
  @type('number') kills = 0;
  @type({ map: Player }) players = new MapSchema<Player>();
  @type({ map: Monster }) monsters = new MapSchema<Monster>();
  @type({ map: Projectile }) projectiles = new MapSchema<Projectile>();
  @type({ map: Gem }) gems = new MapSchema<Gem>();
}
