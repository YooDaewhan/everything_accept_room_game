import test from 'node:test';
import assert from 'node:assert/strict';
import { CHARACTERS, GAME, UPGRADES } from '@wse/shared';
import { GameState, Player, Monster } from '../apps/server/dist/schema/GameState.js';
import { Simulation } from '../apps/server/dist/simulation/Simulation.js';
import { awardXp, chooseUpgrade } from '../apps/server/dist/systems/Progression.js';

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

test('monster dies once and awards one gem pickup', () => {
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
  assert.equal(player.hp, GAME.playerHp - GAME.monsterDamage);
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
  const dartIndex = choices.indexOf('dart');
  if (dartIndex >= 0) chooseUpgrade(player, dartIndex);
  else { player.choice0 = 'dart'; chooseUpgrade(player, 0); }
  assert.equal(player.upgrades.get('dart'), 1);
  assert.equal(chooseUpgrade(player, 0), false);
  awardXp(player, 32);
  player.choice0 = 'dart';
  assert.equal(chooseUpgrade(player, 0), true);
  assert.equal(player.upgrades.get('dart'), 2);
});

test('only the player choosing an upgrade pauses while three monster kinds chase at different speeds', () => {
  const state = new GameState(); state.phase = 'running'; state.difficulty = 'easy';
  const player = new Player(); player.x = 500; player.y = 100; player.pendingUpgrade = true; state.players.set('a', player);
  for (const kind of ['grunt', 'runner', 'brute']) {
    const monster = new Monster(); monster.kind = kind; monster.x = 100; monster.y = 100; state.monsters.set(kind, monster);
  }
  const simulation = new Simulation(state); simulation.input.set('a', { x: 1, y: 0 }); simulation.tick();
  assert.equal(player.x, 500);
  assert.ok(state.monsters.get('runner').x > state.monsters.get('grunt').x);
  assert.ok(state.monsters.get('grunt').x > state.monsters.get('brute').x);
  assert.equal(state.elapsedMs, GAME.tickMs);
});
