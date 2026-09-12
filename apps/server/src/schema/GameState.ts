import { Schema, MapSchema, type } from '@colyseus/schema';
import { GAME } from '@wse/shared';
export class Player extends Schema {
  @type('string') nickname = '';
  @type('string') character = 'guardian';
  @type('number') x = 0;
  @type('number') y = 0;
  @type('number') hp: number = GAME.playerHp;
  @type('number') maxHp: number = GAME.playerHp;
  @type('number') xp = 0;
  @type('boolean') alive = true;
}
export class Monster extends Schema {
  @type('number') x = 0; @type('number') y = 0;
  @type('number') hp: number = GAME.monsterHp; @type('number') maxHp: number = GAME.monsterHp;
}
export class Projectile extends Schema {
  @type('number') x = 0; @type('number') y = 0;
}
export class Gem extends Schema {
  @type('number') x = 0; @type('number') y = 0;
}
export class GameState extends Schema {
  @type('string') code = '';
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
