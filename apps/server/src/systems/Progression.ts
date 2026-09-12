import { randomInt } from 'node:crypto';
import { UPGRADES, type UpgradeId } from '@wse/shared';
import { Player } from '../schema/GameState.js';

const upgradeIds = Object.keys(UPGRADES) as UpgradeId[];
const weaponIds = upgradeIds.filter(id => UPGRADES[id].kind === 'weapon');
export const upgradeLevel = (player: Player, id: UpgradeId): number => player.upgrades.get(id) ?? 0;
export const xpNeeded = (level: number): number => 20 + (level - 1) * 12;

export function awardXp(player: Player, amount: number): void {
  if (!player.alive || !Number.isFinite(amount) || amount <= 0) return;
  player.xp += amount;
  if (!player.pendingUpgrade) queueLevelUp(player);
}

function queueLevelUp(player: Player): void {
  if (player.xp < player.xpToNext) return;
  player.xp -= player.xpToNext;
  player.level += 1;
  player.xpToNext = xpNeeded(player.level);
  const first = weaponIds[randomInt(weaponIds.length)];
  const pool = upgradeIds.filter(id => id !== first);
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

export function chooseUpgrade(player: Player, index: unknown): boolean {
  if (!player.alive || !player.pendingUpgrade || !Number.isInteger(index) || typeof index !== 'number' || index < 0 || index > 2) return false;
  const id = [player.choice0, player.choice1, player.choice2][index] as UpgradeId;
  if (!(id in UPGRADES)) return false;
  const nextLevel = upgradeLevel(player, id) + 1;
  player.upgrades.set(id, nextLevel);
  if (id === 'vitality') { player.maxHp += 20; player.hp = Math.min(player.maxHp, player.hp + 20); }
  player.pendingUpgrade = false;
  player.choice0 = ''; player.choice1 = ''; player.choice2 = '';
  queueLevelUp(player);
  return true;
}
