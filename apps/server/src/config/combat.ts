import { GAME, type MapId, type MonsterKind, type WeaponId } from '@wse/shared';

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

export const WEAPON_RULES: Record<WeaponId, { cooldown: number; damage: number; speed: number; radius: number; life: number; count: number; mode: 'aimed' | 'spread' | 'radial' }> = {
  orbit: { cooldown: 350, damage: 5, speed: 0, radius: 10, life: 0, count: 1, mode: 'radial' },
  basic: { cooldown: 800, damage: 10, speed: 460, radius: 5, life: 1200, count: 1, mode: 'aimed' },
  trail: { cooldown: 250, damage: 4, speed: 0, radius: 18, life: 1800, count: 1, mode: 'radial' },
  pet: { cooldown: 850, damage: 7, speed: 420, radius: 5, life: 1100, count: 1, mode: 'aimed' },
  meteor: { cooldown: 1800, damage: 18, speed: 0, radius: 40, life: 1400, count: 1, mode: 'radial' },
  slowfield: { cooldown: 450, damage: 3, speed: 0, radius: 130, life: 0, count: 1, mode: 'radial' },
  bounce: { cooldown: 1100, damage: 9, speed: 420, radius: 6, life: 1300, count: 1, mode: 'aimed' },
  cannon: { cooldown: 1600, damage: 25, speed: 260, radius: 12, life: 1800, count: 1, mode: 'aimed' },
};
