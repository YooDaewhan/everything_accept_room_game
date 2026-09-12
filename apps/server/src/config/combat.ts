import { GAME, type MonsterKind, type WeaponId } from '@wse/shared';

export const MONSTER_RULES: Record<MonsterKind, { hp: number; speed: number; damage: number; radius: number; xp: number }> = {
  grunt: { hp: GAME.monsterHp, speed: GAME.monsterSpeed, damage: GAME.monsterDamage, radius: 16, xp: 5 },
  runner: { hp: 18, speed: 105, damage: 7, radius: 12, xp: 7 },
  brute: { hp: 75, speed: 38, damage: 16, radius: 24, xp: 12 },
};

export const WEAPON_RULES: Record<WeaponId, { cooldown: number; damage: number; speed: number; radius: number; life: number; count: number; mode: 'aimed' | 'spread' | 'radial' }> = {
  pulse: { cooldown: 800, damage: 10, speed: 460, radius: 5, life: 1200, count: 1, mode: 'aimed' },
  dart: { cooldown: 420, damage: 6, speed: 610, radius: 4, life: 900, count: 1, mode: 'aimed' },
  spread: { cooldown: 1250, damage: 7, speed: 440, radius: 4, life: 1000, count: 3, mode: 'spread' },
  nova: { cooldown: 1900, damage: 5, speed: 320, radius: 5, life: 900, count: 8, mode: 'radial' },
  ember: { cooldown: 1500, damage: 17, speed: 340, radius: 8, life: 1300, count: 1, mode: 'aimed' },
};
