import { createHash, timingSafeEqual } from 'node:crypto';
import { Room, type Client } from 'colyseus';
import { BOARD_GAMES, BOARD_MSG, BOARD_RULES, NICKNAME_PATTERN, type BoardGameId } from '@wse/shared';
import { BoardState, BoardPlayer } from '../schema/BoardState.js';
import { addRoom, removeRoom, reserveRoomCode, roomPassword, roomTitle, updateRoom } from './directory.js';


export class BoardRoom extends Room<{ state: BoardState }> {
  maxClients = 2;
  private code = '';
  private passwordHash = '';
  private chatClock = new Map<string, number>();

  private get seats(): readonly string[] { return BOARD_GAMES[this.state.game as BoardGameId].seats; }

  private reset(): void {
    const game = this.state.game as BoardGameId;
    this.state.board = BOARD_RULES[game].initial;
    this.state.turn = this.seats[0];
    this.state.winner = '';
    this.state.lastMove = '';
  }

  onCreate(options: unknown): void {
    const settings = typeof options === 'object' && options !== null ? options as { game?: unknown; title?: unknown; password?: unknown } : {};
    this.setState(new BoardState());
    this.state.game = typeof settings.game === 'string' && settings.game in BOARD_GAMES ? settings.game : 'omok';
    const code = reserveRoomCode(); this.code = code; this.roomId = code;
    this.state.code = code;
    const password = roomPassword(settings.password);
    this.passwordHash = password ? createHash('sha256').update(password).digest('hex') : '';
    this.state.title = roomTitle(settings.title, `${BOARD_GAMES[this.state.game as BoardGameId].name} 방`);
    this.state.locked = Boolean(password);
    addRoom({ code, title: this.state.title, game: this.state.game as BoardGameId, players: 0, maxPlayers: 2, locked: this.state.locked, phase: 'lobby' });
    this.reset();

    this.onMessage(BOARD_MSG.START, client => {
      if (client.sessionId !== this.state.hostId || this.state.phase !== 'lobby' || this.state.players.size < 2) return;
      this.reset();
      this.state.phase = 'running';
      updateRoom(this.code, { phase: 'running' });
    });

    this.onMessage(BOARD_MSG.SETTINGS, (client, value: unknown) => {
      if (client.sessionId !== this.state.hostId || this.state.phase !== 'lobby' || typeof value !== 'object' || value === null) return;
      const settings = value as { title?: unknown; password?: unknown };
      if (typeof settings.title === 'string') this.state.title = roomTitle(settings.title, this.state.title);
      if (typeof settings.password === 'string') {
        const password = roomPassword(settings.password);
        this.passwordHash = password ? createHash('sha256').update(password).digest('hex') : '';
        this.state.locked = Boolean(password);
      }
      updateRoom(this.code, { title: this.state.title, locked: this.state.locked });
    });

    this.onMessage(BOARD_MSG.SKIN, (client, value: unknown) => {
      if (this.state.phase !== 'lobby' || typeof value !== 'object' || value === null) return;
      const choice = value as { kind?: unknown; id?: unknown };
      if ((choice.kind !== 'field' && choice.kind !== 'piece') || typeof choice.id !== 'string' || !/^[a-z0-9_-]{1,32}$/.test(choice.id)) return;
      const player = this.state.players.get(client.sessionId);
      if (player) {
        if (choice.kind === 'field') player.fieldSkin = choice.id;
        else player.pieceSkin = choice.id;
      }
    });

    this.onMessage(BOARD_MSG.CHAT, (client, value: unknown) => {
      const player = this.state.players.get(client.sessionId);
      if (!player || typeof value !== 'string') return;
      const text = value.trim().slice(0, 200);
      const now = Date.now();
      if (!text || now - (this.chatClock.get(client.sessionId) ?? 0) < 500) return;
      this.chatClock.set(client.sessionId, now);
      this.broadcast(BOARD_MSG.CHAT, { nickname: player.nickname, text, at: now });
    });

    this.onMessage(BOARD_MSG.MOVE, (client, payload: unknown) => {
      if (this.state.phase !== 'running') return;
      const player = this.state.players.get(client.sessionId);
      if (!player || player.seat !== this.state.turn) return;
      const next = BOARD_RULES[this.state.game as BoardGameId].apply(this.state.board, payload, player.seat);
      if (!next) return;
      this.state.board = next.board;
      this.state.lastMove = next.move;
      if (next.result) {
        this.state.winner = next.result === 'draw' ? 'draw' : client.sessionId;
        this.state.phase = 'over';
      } else this.state.turn = this.seats[this.seats.indexOf(player.seat) === 0 ? 1 : 0];
    });

    this.onMessage(BOARD_MSG.REMATCH, () => {
      if (this.state.phase !== 'over') return;
      // 재대국마다 선후공을 바꾼다.
      for (const player of this.state.players.values()) player.seat = this.seats[this.seats.indexOf(player.seat) === 0 ? 1 : 0];
      this.reset();
      this.state.phase = 'running';
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
    const player = new BoardPlayer();
    player.nickname = options.nickname.trim();
    player.seat = this.seats[this.state.players.size === 0 ? 0 : 1];
    this.state.players.set(client.sessionId, player);
    updateRoom(this.code, { players: this.state.players.size });
    if (!this.state.hostId) this.state.hostId = client.sessionId;
  }

  onLeave(client: Client): void {
    this.state.players.delete(client.sessionId);
    this.chatClock.delete(client.sessionId);
    updateRoom(this.code, { players: this.state.players.size });
    if (this.state.hostId === client.sessionId) this.state.hostId = this.state.players.keys().next().value ?? '';
    if (this.state.phase === 'running') { this.state.phase = 'over'; this.state.winner = this.state.hostId; }
  }

  onDispose(): void { removeRoom(this.code); }
}
