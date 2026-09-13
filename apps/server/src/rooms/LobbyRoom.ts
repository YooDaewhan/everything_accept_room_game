import { createHash, timingSafeEqual } from 'node:crypto';
import { Room, type Client } from 'colyseus';
import { CHARACTERS, DIFFICULTIES, GAME, MAPS, MAX_PLAYERS, MSG, NICKNAME_PATTERN, ROLES, type CharacterId, type DifficultyId, type InputMessage, type MapId, type RoleId } from '@wse/shared';
import { GameState, Player } from '../schema/GameState.js';
import { Simulation } from '../simulation/Simulation.js';
import { chooseEvolution, chooseUpgrade } from '../systems/Progression.js';
import { addRoom, removeRoom, reserveRoomCode, roomPassword, roomTitle, updateRoom } from './directory.js';
export class LobbyRoom extends Room<{ state: GameState }> {
  maxClients = MAX_PLAYERS;
  private code = '';
  private passwordHash = '';
  private simulation!: Simulation;
  private lastInput = new Map<string, number>();
  private chatClock = new Map<string, number>();
  onCreate(options: unknown): void {
    const settings = typeof options === 'object' && options !== null ? options as { map?: unknown; difficulty?: unknown; title?: unknown; password?: unknown } : {};
    const map = typeof settings.map === 'string' && settings.map in MAPS ? settings.map as MapId : 'ruins';
    const difficulty = typeof settings.difficulty === 'string' && settings.difficulty in DIFFICULTIES ? settings.difficulty as DifficultyId : 'easy';
    const code = reserveRoomCode(); this.code = code; this.roomId = code;
    this.setState(new GameState()); this.state.code = code;
    this.state.map = map;
    this.state.difficulty = difficulty;
    const password = roomPassword(settings.password);
    this.passwordHash = password ? createHash('sha256').update(password).digest('hex') : '';
    this.state.title = roomTitle(settings.title, '서바이버즈 방');
    this.state.locked = Boolean(password);
    addRoom({ code, title: this.state.title, game: 'survivors', players: 0, maxPlayers: MAX_PLAYERS, locked: this.state.locked, map, difficulty, phase: 'lobby' });
    this.simulation = new Simulation(this.state);
    this.setPatchRate(GAME.patchMs);
    this.setSimulationInterval(() => this.simulation.tick(), GAME.tickMs);
    this.onMessage(MSG.INPUT, (client, payload: unknown) => {
      const player = this.state.players.get(client.sessionId);
      if (this.state.phase !== 'running' || !player?.alive || player.pendingUpgrade || player.pendingEvolution) return;
      const now = Date.now(); if (now - (this.lastInput.get(client.sessionId) ?? 0) < 25) return;
      this.lastInput.set(client.sessionId, now);
      if (typeof payload !== 'object' || payload === null || !('x' in payload) || !('y' in payload)) return;
      const { x, y, aimX, aimY } = payload as InputMessage;
      if (!Number.isFinite(x) || !Number.isFinite(y) || Math.abs(x) > 1 || Math.abs(y) > 1) return;
      const length = Math.hypot(x, y);
      this.simulation.input.set(client.sessionId, length > 1 ? { x: x / length, y: y / length } : { x, y });
      if (typeof aimX === 'number' && typeof aimY === 'number' && Number.isFinite(aimX) && Number.isFinite(aimY) && Math.hypot(aimX, aimY) > 0.1 && Math.abs(aimX) <= 1 && Math.abs(aimY) <= 1) {
        const aimLength = Math.hypot(aimX, aimY);
        this.simulation.aim.set(client.sessionId, { x: aimX / aimLength, y: aimY / aimLength });
      }
    });
    this.onMessage(MSG.START, client => {
      if (client.sessionId === this.state.hostId && this.state.phase === 'lobby') {
        for (const player of this.state.players.values()) player.pendingEvolution = 'basic';
        this.state.phase = 'running';
        updateRoom(this.code, { phase: 'running' });
      }
    });
    this.onMessage(MSG.SETTINGS, (client, value: unknown) => {
      if (client.sessionId !== this.state.hostId || this.state.phase !== 'lobby' || typeof value !== 'object' || value === null) return;
      const settings = value as { title?: unknown; password?: unknown; map?: unknown; difficulty?: unknown };
      if (typeof settings.title === 'string') this.state.title = roomTitle(settings.title, this.state.title);
      if (typeof settings.password === 'string') {
        const password = roomPassword(settings.password);
        this.passwordHash = password ? createHash('sha256').update(password).digest('hex') : '';
        this.state.locked = Boolean(password);
      }
      if (typeof settings.map === 'string' && Object.hasOwn(MAPS, settings.map)) this.state.map = settings.map;
      if (typeof settings.difficulty === 'string' && Object.hasOwn(DIFFICULTIES, settings.difficulty)) this.state.difficulty = settings.difficulty;
      updateRoom(this.code, { title: this.state.title, locked: this.state.locked, map: this.state.map as MapId, difficulty: this.state.difficulty as DifficultyId });
    });
    this.onMessage(MSG.CHAT, (client, value: unknown) => {
      const player = this.state.players.get(client.sessionId);
      if (!player || typeof value !== 'string') return;
      const text = value.trim().slice(0, 200);
      const now = Date.now();
      if (!text || now - (this.chatClock.get(client.sessionId) ?? 0) < 500) return;
      this.chatClock.set(client.sessionId, now);
      this.broadcast(MSG.CHAT, { nickname: player.nickname, text, at: now });
    });
    this.onMessage(MSG.CHARACTER, (client, value: unknown) => {
      if (this.state.phase !== 'lobby' || typeof value !== 'string' || !(value in CHARACTERS)) return;
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      const character = value as CharacterId;
      player.character = character;
      player.maxHp = Math.round(CHARACTERS[character].hp * (player.role === 'defense' ? 1.1 : 1));
      player.hp = player.maxHp;
    });
    this.onMessage(MSG.ROLE, (client, value: unknown) => {
      if (this.state.phase !== 'lobby' || typeof value !== 'string' || !Object.hasOwn(ROLES, value)) return;
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      player.role = value as RoleId;
      player.maxHp = Math.round(CHARACTERS[player.character as CharacterId].hp * (player.role === 'defense' ? 1.1 : 1));
      player.hp = player.maxHp;
    });
    this.onMessage(MSG.UPGRADE, (client, index: unknown) => {
      if (this.state.phase !== 'running') return;
      const player = this.state.players.get(client.sessionId);
      if (player) chooseUpgrade(player, index, this.state.elapsedMs);
    });
    this.onMessage(MSG.EVOLUTION, (client, branch: unknown) => {
      if (this.state.phase !== 'running') return;
      const player = this.state.players.get(client.sessionId);
      if (player) chooseEvolution(player, branch, this.state.elapsedMs);
    });
  }
  onAuth(_client: Client, options: unknown): boolean {
    const nickname = typeof options === 'object' && options !== null && 'nickname' in options ? (options as { nickname: unknown }).nickname : null;
    if (typeof nickname !== 'string' || !NICKNAME_PATTERN.test(nickname.trim())) throw new Error('닉네임은 2~16자의 문자, 숫자, 공백, _ 또는 -만 사용할 수 있습니다.');
    if (this.state.phase !== 'lobby') throw new Error('이미 시작한 방입니다.');
    if (this.passwordHash) {
      const supplied = typeof options === 'object' && options !== null && 'password' in options ? roomPassword((options as { password: unknown }).password) : '';
      const hash = createHash('sha256').update(supplied).digest();
      if (!timingSafeEqual(hash, Buffer.from(this.passwordHash, 'hex'))) throw new Error('비밀번호가 올바르지 않습니다.');
    }
    return true;
  }
  onJoin(client: Client, options: { nickname: string }): void {
    if (this.state.players.has(client.sessionId)) throw new Error('이미 참가한 세션입니다.');
    const player = new Player(); player.nickname = options.nickname.trim();
    player.hp = CHARACTERS.guardian.hp; player.maxHp = player.hp;
    const offset = this.state.players.size === 0 ? -35 : 35;
    player.x = GAME.width / 2 + offset; player.y = GAME.height / 2;
    this.state.players.set(client.sessionId, player);
    updateRoom(this.code, { players: this.state.players.size });
    if (!this.state.hostId) this.state.hostId = client.sessionId;
  }
  onLeave(client: Client): void {
    this.state.players.delete(client.sessionId); this.simulation.removePlayer(client.sessionId); this.lastInput.delete(client.sessionId);
    this.chatClock.delete(client.sessionId);
    updateRoom(this.code, { players: this.state.players.size });
    if (this.state.hostId === client.sessionId) this.state.hostId = this.state.players.keys().next().value ?? '';
  }
  onDispose(): void { removeRoom(this.code); }
}
