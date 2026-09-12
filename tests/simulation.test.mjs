import test from 'node:test';
import assert from 'node:assert/strict';
import { CHARACTERS, GAME } from '@wse/shared';
import { GameState, Player, Monster } from '../apps/server/dist/schema/GameState.js';
import { Simulation } from '../apps/server/dist/simulation/Simulation.js';

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
