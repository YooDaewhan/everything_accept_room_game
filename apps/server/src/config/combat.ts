import { GAME, type MapId, type MonsterKind } from '@wse/shared';
export { WEAPON_RULES } from '@wse/shared';

export const MAP_MONSTER_POOLS: Record<MapId, ReadonlyArray<{ kind: MonsterKind; weight: number }>> = {
  ruins: [{ kind: 'grunt', weight: 75 }, { kind: 'ranger', weight: 20 }, { kind: 'charger', weight: 5 }],
  forest: [{ kind: 'grunt', weight: 75 }, { kind: 'ranger', weight: 20 }, { kind: 'charger', weight: 5 }],
  ember: [{ kind: 'grunt', weight: 75 }, { kind: 'ranger', weight: 20 }, { kind: 'charger', weight: 5 }],
};

export const MONSTER_RULES: Record<MonsterKind, { hp: number; speed: number; damage: number; radius: number; xp: number }> = {
  grunt: { hp: GAME.monsterHp, speed: GAME.monsterSpeed, damage: GAME.monsterDamage, radius: 16, xp: 5 },
  ranger: { hp: 24, speed: 46, damage: 9, radius: 14, xp: 10 },
  charger: { hp: 65, speed: 55, damage: 17, radius: 21, xp: 25 },
};
