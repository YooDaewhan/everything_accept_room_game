import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Client, type Room } from '@colyseus/sdk';
import { BOARD_ROOM, NICKNAME_PATTERN, ROOM_NAME, type DifficultyId, type GameView, type MapId } from '@wse/shared';
import { Lobby } from './Lobby';
import { CombatView } from './CombatView';
import { BoardView } from './BoardView';
import { HomeView, type GameChoice } from './HomeView';
import type { RoomListing } from './RoomBrowser';
import './style.css';

const serverUrl = import.meta.env.VITE_GAME_SERVER_URL || (import.meta.env.DEV ? 'http://localhost:2567' : `${window.location.origin}/gs`);
const client = new Client(serverUrl);

function App(): React.JSX.Element {
  const [nickname, setNickname] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [joinPassword, setJoinPassword] = useState('');
  const [lockedRoom, setLockedRoom] = useState<RoomListing | null>(null);
  const [rooms, setRooms] = useState<RoomListing[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [room, setRoom] = useState<Room | null>(null);
  const [view, setView] = useState<GameView | null>(null);
  const [health, setHealth] = useState<'checking' | 'online' | 'offline'>('checking');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [game, setGame] = useState<GameChoice>('survivors');
  const [map] = useState<MapId>('ruins');
  const [difficulty] = useState<DifficultyId>('easy');

  useEffect(() => { fetch(`${serverUrl}/health`).then(response => { if (!response.ok) throw new Error(); setHealth('online'); }).catch(() => setHealth('offline')); }, []);

  async function refreshRooms(): Promise<void> {
    setRoomsLoading(true);
    try {
      const response = await fetch(`${serverUrl}/rooms`);
      if (!response.ok) throw new Error('방 목록을 불러오지 못했습니다.');
      setRooms(await response.json() as RoomListing[]);
    } catch { setRooms([]); }
    finally { setRoomsLoading(false); }
  }
  useEffect(() => { if (!room) void refreshRooms(); }, [room]);

  useEffect(() => {
    if (!room) return;
    room.onLeave(() => { setRoom(null); setView(null); setError('방 연결이 종료되었습니다.'); });
    if (room.name !== ROOM_NAME) return;
    const sync = () => {
      const state = room.state as GameView;
      if (!state?.players) return;
      setView({ code: state.code, title: state.title, locked: state.locked, phase: state.phase, hostId: state.hostId, map: state.map, difficulty: state.difficulty, elapsedMs: state.elapsedMs, kills: state.kills,
        players: new Map([...state.players].map(([id, player]) => [id, { nickname: player.nickname, character: player.character, role: player.role, x: player.x, y: player.y, hp: player.hp, maxHp: player.maxHp, xp: player.xp, xpToNext: player.xpToNext, level: player.level, pendingUpgrade: player.pendingUpgrade, pendingEvolution: player.pendingEvolution, choice0: player.choice0, choice1: player.choice1, choice2: player.choice2, upgrades: new Map(player.upgrades), evolutions: new Map(player.evolutions), invulnerableUntil: player.invulnerableUntil, meleeAttackAt: player.meleeAttackAt, meleeAttackAngle: player.meleeAttackAngle, alive: player.alive }])),
        monsters: new Map(state.monsters), projectiles: new Map(state.projectiles), gems: new Map(state.gems) });
    };
    room.onStateChange(sync);
    sync();
    return () => { room.onStateChange.remove(sync); };
  }, [room]);

  async function connect(join: boolean, roomCode = codeInput, password = joinPassword): Promise<void> {
    const name = nickname.trim();
    if (!NICKNAME_PATTERN.test(name)) { setError('먼저 2~16자의 닉네임을 입력해 주세요.'); return; }
    if (join && !/^[A-Z2-9]{6}$/.test(roomCode.trim().toUpperCase())) { setError('초대 코드는 6자리입니다.'); return; }
    setBusy(true); setError('');
    try {
      const next = join ? await client.joinById(roomCode.trim().toUpperCase(), { nickname: name, password })
        : game === 'survivors' ? await client.create(ROOM_NAME, { nickname: name, map, difficulty })
        : await client.create(BOARD_ROOM, { nickname: name, game });
      setRoom(next);
      setLockedRoom(null);
      setJoinPassword('');
    } catch (cause) {
      const detail = String(cause);
      setError(join && /room .* not found/i.test(detail)
        ? '방을 찾을 수 없습니다. 방장이 방에 있는지 확인하고 목록을 새로고침해 주세요.'
        : `${join ? '참가' : '방 생성'} 실패: ${detail}`);
    } finally { setBusy(false); }
  }

  function joinListing(listing: RoomListing): void {
    if (!NICKNAME_PATTERN.test(nickname.trim())) { setError('먼저 플레이어 이름을 입력해 주세요.'); return; }
    setError('');
    if (listing.locked) { setLockedRoom(listing); setJoinPassword(''); }
    else void connect(true, listing.code, '');
  }

  if (room && room.name === BOARD_ROOM) return <main className="app-connected"><BoardView room={room} leave={() => void room.leave()} /><footer>WSE Every Game · 보드 대국</footer></main>;
  if (room && view && view.phase !== 'lobby') return <CombatView room={room} view={view} leave={() => void room.leave()} />;
  if (room) return <main className="app-connected">{view?.phase === 'lobby' && <Lobby room={room} view={view} leave={() => void room.leave()} />}<footer>WSE Every Game · 로컬 프로토타입</footer></main>;

  return <HomeView game={game} nickname={nickname} code={codeInput} password={joinPassword} lockedRoom={lockedRoom} rooms={rooms} roomsLoading={roomsLoading} health={health} busy={busy} error={error}
    onGame={setGame} onNickname={setNickname} onCode={setCodeInput} onPassword={setJoinPassword} onCreate={() => void connect(false)} onJoinCode={() => void connect(true)} onJoinRoom={joinListing} onRefresh={() => void refreshRooms()}
    onCloseLocked={() => { setLockedRoom(null); setJoinPassword(''); setError(''); }} onJoinLocked={() => { if (lockedRoom) void connect(true, lockedRoom.code, joinPassword); }} />;
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
