import test from 'node:test';
import assert from 'node:assert/strict';
import { CHARACTERS, GAME, MONSTER_KINDS, UPGRADES } from '@wse/shared';
import { GameState, Player, Monster } from '../apps/server/dist/schema/GameState.js';
import { Simulation } from '../apps/server/dist/simulation/Simulation.js';
import { awardXp, chooseEvolution, chooseUpgrade } from '../apps/server/dist/systems/Progression.js';

test('movement uses server input and stays inside map', () => {
  const state = new GameState(); state.phase = 'running';
  const player = new Player(); player.x = GAME.width - GAME.playerRadius; player.y = 100;
  state.players.set('a', player);
  const simulation = new Simulation(state);
  simulation.input.set('a', { x: 1, y: 0 }); simulation.tick();
  assert.equal(player.x, GAME.width - GAME.playerRadius);
  simulation.input.set('a', { x: -1, y: 0 }); simulation.tick();
  assert.equal(player.x, GAME.width - GAME.playerRadius - CHARACTERS.guardian.speed * GAME.tickMs / 1000);
});

test('melee hit kills once and awards one gem pickup', () => {
  const state = new GameState(); state.phase = 'running';
  const player = new Player(); player.x = 100; player.y = 100; state.players.set('a', player);
  const monster = new Monster(); monster.x = 100; monster.y = 100; monster.hp = 10; monster.maxHp = 10; state.monsters.set('m', monster);
  const simulation = new Simulation(state);
  simulation.tick(); simulation.tick();
  assert.equal(state.monsters.size, 0);
  assert.equal(state.kills, 1);
  assert.equal(state.elapsedMs, GAME.tickMs * 2);
  assert.equal(state.gems.size, 0);
  assert.equal(player.xp, GAME.gemXp);
  assert.equal(player.hp, GAME.playerHp);
});

test('level-up offers three distinct choices including a weapon, then upgrades an owned weapon to LV2', () => {
  const player = new Player();
  awardXp(player, 20);
  assert.equal(player.level, 2);
  assert.equal(player.pendingUpgrade, true);
  assert.equal(player.xp, 0);
  assert.equal(player.xpToNext, 32);
  const choices = [player.choice0, player.choice1, player.choice2];
  assert.equal(new Set(choices).size, 3);
  assert.ok(choices.some(id => UPGRADES[id].kind === 'weapon'));
  assert.equal(chooseUpgrade(player, 3), false);
  assert.equal(player.pendingUpgrade, true);
  const orbitIndex = choices.indexOf('orbit');
  if (orbitIndex >= 0) chooseUpgrade(player, orbitIndex);
  else { player.choice0 = 'orbit'; chooseUpgrade(player, 0); }
  assert.equal(player.upgrades.get('orbit'), 1);
  assert.equal(chooseUpgrade(player, 0), false);
  awardXp(player, 32);
  player.choice0 = 'orbit';
  assert.equal(chooseUpgrade(player, 0, 1000), true);
  assert.equal(player.invulnerableUntil, 4000);
  assert.equal(player.upgrades.get('orbit'), 2);
});

test('level 5 weapon opens F/T evolution, choice grants 3 seconds invulnerability, and level 10 leaves upgrade pool', () => {
  const player = new Player();
  player.upgrades.set('orbit', 4);
  awardXp(player, player.xpToNext);
  player.choice0 = 'orbit';
  assert.equal(chooseUpgrade(player, 0), true);
  assert.equal(player.pendingEvolution, 'orbit');
  assert.equal(chooseEvolution(player, 'X', 1000), false);
  assert.equal(chooseEvolution(player, 'F', 1000), true);
  assert.equal(player.evolutions.get('orbit'), 'F');
  assert.equal(player.invulnerableUntil, 4000);
  player.upgrades.set('orbit', 10);
  awardXp(player, player.xpToNext);
  assert.ok(![player.choice0, player.choice1, player.choice2].includes('orbit'));
});

test('ranged monster fires, charger dashes, and level-up player is not damaged', () => {
  const state = new GameState(); state.phase = 'running'; state.difficulty = 'easy';
  const player = new Player(); player.x = 300; player.y = 100; player.pendingUpgrade = true; state.players.set('a', player);
  const ranged = new Monster(); ranged.kind = 'ranger'; ranged.x = 100; ranged.y = 100; state.monsters.set('ranger', ranged);
  const charger = new Monster(); charger.kind = 'charger'; charger.x = 100; charger.y = 100; state.monsters.set('charger', charger);
  const simulation = new Simulation(state); simulation.input.set('a', { x: 1, y: 0 }); simulation.tick();
  assert.equal(player.x, 300);
  assert.equal(Object.keys(MONSTER_KINDS).length, 3);
  assert.ok(state.monsters.get('charger').x > state.monsters.get('ranger').x);
  assert.ok([...state.projectiles.values()].some(bullet => bullet.owner === 'enemy'));
  assert.equal(state.elapsedMs, GAME.tickMs);
});

test('melee basic attack follows mouse aim and defense reduces contact damage', () => {
  const state = new GameState(); state.phase = 'running';
  const player = new Player(); player.x = 100; player.y = 100; state.players.set('a', player);
  const right = new Monster(); right.x = 150; right.y = 100; right.hp = 100; right.maxHp = 100; state.monsters.set('right', right);
  const left = new Monster(); left.x = 50; left.y = 100; left.hp = 100; left.maxHp = 100; state.monsters.set('left', left);
  const simulation = new Simulation(state); simulation.aim.set('a', { x: 1, y: 0 }); simulation.tick();
  assert.ok(right.hp < 100);
  assert.equal(left.hp, 100);
  player.upgrades.delete('basic'); player.role = 'defense';
  const contact = new Monster(); contact.x = 100; contact.y = 100; state.monsters.set('contact', contact);
  simulation.tick();
  assert.ok(player.hp <= 100 - 8 && player.hp >= 100 - 9);
});
