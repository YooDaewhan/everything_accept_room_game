import { randomInt } from 'node:crypto';
import { Room, type Client } from 'colyseus';
import { CHARACTERS, DIFFICULTIES, GAME, MAPS, MAX_PLAYERS, MSG, NICKNAME_PATTERN, type CharacterId, type DifficultyId, type InputMessage, type MapId } from '@wse/shared';
import { GameState, Player } from '../schema/GameState.js';
import { Simulation } from '../simulation/Simulation.js';
const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const activeCodes = new Set<string>();
export class LobbyRoom extends Room<{ state: GameState }> {
  maxClients = MAX_PLAYERS;
  private code = '';
  private simulation!: Simulation;
  private lastInput = new Map<string, number>();
  onCreate(): void {
    let code: string;
    do { code = Array.from({ length: 6 }, () => alphabet[randomInt(alphabet.length)]).join(''); } while (activeCodes.has(code));
    activeCodes.add(code); this.code = code; this.roomId = code;
    this.setState(new GameState()); this.state.code = code;
    this.simulation = new Simulation(this.state);
    this.setPatchRate(GAME.patchMs);
    this.setSimulationInterval(() => this.simulation.tick(), GAME.tickMs);
    this.onMessage(MSG.INPUT, (client, payload: unknown) => {
      if (this.state.phase !== 'running' || !this.state.players.get(client.sessionId)?.alive) return;
      const now = Date.now(); if (now - (this.lastInput.get(client.sessionId) ?? 0) < 25) return;
      this.lastInput.set(client.sessionId, now);
      if (typeof payload !== 'object' || payload === null || !('x' in payload) || !('y' in payload)) return;
      const { x, y } = payload as InputMessage;
      if (!Number.isFinite(x) || !Number.isFinite(y) || Math.abs(x) > 1 || Math.abs(y) > 1) return;
      const length = Math.hypot(x, y);
      this.simulation.input.set(client.sessionId, length > 1 ? { x: x / length, y: y / length } : { x, y });
    });
    this.onMessage(MSG.START, client => {
      if (client.sessionId === this.state.hostId && this.state.phase === 'lobby') this.state.phase = 'running';
    });
    this.onMessage(MSG.CHARACTER, (client, value: unknown) => {
      if (this.state.phase !== 'lobby' || typeof value !== 'string' || !(value in CHARACTERS)) return;
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      const character = value as CharacterId;
      player.character = character;
      player.maxHp = CHARACTERS[character].hp;
      player.hp = player.maxHp;
    });
    this.onMessage(MSG.SETTINGS, (client, value: unknown) => {
      if (this.state.phase !== 'lobby' || client.sessionId !== this.state.hostId || typeof value !== 'object' || value === null) return;
      if ('map' in value && typeof value.map === 'string' && value.map in MAPS) this.state.map = value.map as MapId;
      if ('difficulty' in value && typeof value.difficulty === 'string' && value.difficulty in DIFFICULTIES) this.state.difficulty = value.difficulty as DifficultyId;
    });
  }
  onAuth(_client: Client, options: unknown): boolean {
    const nickname = typeof options === 'object' && options !== null && 'nickname' in options ? (options as { nickname: unknown }).nickname : null;
    if (typeof nickname !== 'string' || !NICKNAME_PATTERN.test(nickname.trim())) throw new Error('닉네임은 2~16자의 문자, 숫자, 공백, _ 또는 -만 사용할 수 있습니다.');
    if (this.state.phase !== 'lobby') throw new Error('이미 시작한 방입니다.');
    return true;
  }
  onJoin(client: Client, options: { nickname: string }): void {
    if (this.state.players.has(client.sessionId)) throw new Error('이미 참가한 세션입니다.');
    const player = new Player(); player.nickname = options.nickname.trim();
    player.hp = CHARACTERS.guardian.hp; player.maxHp = player.hp;
    const offset = this.state.players.size === 0 ? -35 : 35;
    player.x = GAME.width / 2 + offset; player.y = GAME.height / 2;
    this.state.players.set(client.sessionId, player);
    if (!this.state.hostId) this.state.hostId = client.sessionId;
  }
  onLeave(client: Client): void {
    this.state.players.delete(client.sessionId); this.simulation.removePlayer(client.sessionId); this.lastInput.delete(client.sessionId);
    if (this.state.hostId === client.sessionId) this.state.hostId = this.state.players.keys().next().value ?? '';
  }
  onDispose(): void { activeCodes.delete(this.code); }
}
