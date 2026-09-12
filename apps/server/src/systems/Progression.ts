import { randomInt } from 'node:crypto';
import { UPGRADES, type UpgradeId, type WeaponId } from '@wse/shared';
import { Player } from '../schema/GameState.js';

const upgradeIds = Object.keys(UPGRADES) as UpgradeId[];
const weaponIds = upgradeIds.filter(id => UPGRADES[id].kind === 'weapon');
export const COMBINATION_RECIPES: ReadonlyArray<{ first: WeaponId; second: WeaponId; result: string }> = [];
const MAX_WEAPON_LEVEL = 10;
export const upgradeLevel = (player: Player, id: UpgradeId): number => player.upgrades.get(id) ?? 0;
export const xpNeeded = (level: number): number => 20 + (level - 1) * 12;

export function awardXp(player: Player, amount: number): void {
  if (!player.alive || !Number.isFinite(amount) || amount <= 0) return;
  player.xp += amount;
  if (!player.pendingUpgrade && !player.pendingEvolution) queueLevelUp(player);
}

function queueLevelUp(player: Player): void {
  if (player.pendingUpgrade || player.pendingEvolution || player.xp < player.xpToNext) return;
  player.xp -= player.xpToNext;
  player.level += 1;
  player.xpToNext = xpNeeded(player.level);
  const ownedWeapons = weaponIds.filter(id => upgradeLevel(player, id) > 0).length;
  const eligible = upgradeIds.filter(id => UPGRADES[id].kind !== 'weapon' || (upgradeLevel(player, id) < MAX_WEAPON_LEVEL && (upgradeLevel(player, id) > 0 || ownedWeapons < 6)));
  const weapons = weaponIds.filter(id => eligible.includes(id));
  const first = weapons.length ? weapons[randomInt(weapons.length)] : eligible[randomInt(eligible.length)];
  const pool = eligible.filter(id => id !== first);
  for (let i = 0; i < 2; i++) {
    const pick = i + randomInt(pool.length - i);
    [pool[i], pool[pick]] = [pool[pick], pool[i]];
  }
  const choices = [first, pool[0], pool[1]];
  const swap = randomInt(3);
  [choices[0], choices[swap]] = [choices[swap], choices[0]];
  [player.choice0, player.choice1, player.choice2] = choices;
  player.pendingUpgrade = true;
}

export function chooseUpgrade(player: Player, index: unknown, elapsedMs = 0): boolean {
  if (!player.alive || !player.pendingUpgrade || typeof index !== 'number' || !Number.isInteger(index) || index < 0 || index > 2) return false;
  const id = [player.choice0, player.choice1, player.choice2][index] as UpgradeId;
  if (!Object.hasOwn(UPGRADES, id) || (UPGRADES[id].kind === 'weapon' && (upgradeLevel(player, id) >= MAX_WEAPON_LEVEL || (upgradeLevel(player, id) === 0 && weaponIds.filter(weapon => upgradeLevel(player, weapon) > 0).length >= 6)))) return false;
  const nextLevel = upgradeLevel(player, id) + 1;
  player.upgrades.set(id, nextLevel);
  if (id === 'vitality') { player.maxHp += 20; player.hp = Math.min(player.maxHp, player.hp + 20); }
  player.pendingUpgrade = false;
  player.choice0 = ''; player.choice1 = ''; player.choice2 = '';
  player.invulnerableUntil = elapsedMs + 3000;
  if (UPGRADES[id].kind === 'weapon' && nextLevel === 1) player.pendingEvolution = id;
  else queueLevelUp(player);
  return true;
}

export function chooseEvolution(player: Player, branch: unknown, elapsedMs: number): boolean {
  if (!player.alive || !player.pendingEvolution || (branch !== 'F' && branch !== 'T')) return false;
  player.evolutions.set(player.pendingEvolution, branch);
  player.pendingEvolution = '';
  player.invulnerableUntil = elapsedMs + 3000;
  queueLevelUp(player);
  return true;
}

export function applyCombinations(player: Player): void {
  for (const recipe of COMBINATION_RECIPES) {
    if (upgradeLevel(player, recipe.first) === MAX_WEAPON_LEVEL && upgradeLevel(player, recipe.second) === MAX_WEAPON_LEVEL) {
      player.upgrades.delete(recipe.first); player.upgrades.delete(recipe.second);
      player.upgrades.set(recipe.result, 1);
    }
  }
}
