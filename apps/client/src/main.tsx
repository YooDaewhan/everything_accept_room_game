import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Client, type Room } from '@colyseus/sdk';
import { BOARD_GAMES, BOARD_ROOM, NICKNAME_PATTERN, ROOM_NAME, type BoardGameId, type DifficultyId, type GameView, type MapId } from '@wse/shared';
import { Lobby } from './Lobby';
import { CombatView } from './CombatView';
import { BoardView } from './BoardView';
import { RoomBrowser, type RoomListing } from './RoomBrowser';
import './style.css';

const serverUrl = import.meta.env.VITE_GAME_SERVER_URL ?? 'http://localhost:2567';
const client = new Client(serverUrl);
type GameChoice = 'survivors' | BoardGameId;
const GAME_CHOICES: { id: GameChoice; name: string; description: string }[] = [
  { id: 'survivors', name: '서바이버즈', description: '실시간 협동 생존. 최대 2명이 같은 전장에서 버팁니다.' },
  ...(Object.entries(BOARD_GAMES) as [BoardGameId, typeof BOARD_GAMES[BoardGameId]][]).map(([id, game]) => ({ id: id as GameChoice, name: game.name, description: game.description })),
];

function App(): React.JSX.Element {
  const [nickname, setNickname] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [joinPassword, setJoinPassword] = useState('');
  const [rooms, setRooms] = useState<RoomListing[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [room, setRoom] = useState<Room | null>(null);
  const [view, setView] = useState<GameView | null>(null);
  const [health, setHealth] = useState<'checking' | 'online' | 'offline'>('checking');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [game, setGame] = useState<GameChoice>('survivors');
  const [map, setMap] = useState<MapId>('ruins');
  const [difficulty, setDifficulty] = useState<DifficultyId>('easy');

  useEffect(() => { fetch(`${serverUrl}/health`).then(r => { if (!r.ok) throw new Error(); setHealth('online'); }).catch(() => setHealth('offline')); }, []);
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

  async function connect(join: boolean, roomCode = codeInput): Promise<void> {
    const name = nickname.trim();
    if (!NICKNAME_PATTERN.test(name)) { setError('닉네임은 2~16자의 문자, 숫자, 공백, _ 또는 -만 사용할 수 있습니다.'); return; }
    if (join && !/^[A-Z2-9]{6}$/.test(roomCode.trim().toUpperCase())) { setError('초대 코드는 6자리입니다.'); return; }
    setBusy(true); setError('');
    try {
      if (join) setRoom(await client.joinById(roomCode.trim().toUpperCase(), { nickname: name, password: joinPassword }));
      else if (game === 'survivors') setRoom(await client.create(ROOM_NAME, { nickname: name, map, difficulty }));
      else setRoom(await client.create(BOARD_ROOM, { nickname: name, game }));
    }
    catch (cause) { setError(join ? `참가 실패: 방이 없거나 가득 찼습니다. (${String(cause)})` : `방 생성 실패: ${String(cause)}`); }
    finally { setBusy(false); }
  }

  function openCreate(): void {
    if (!NICKNAME_PATTERN.test(nickname.trim())) { setError('먼저 2~16자의 닉네임을 입력해 주세요.'); return; }
    setError('');
    void connect(false);
  }

  if (room && room.name === BOARD_ROOM) return <main className="app-connected"><BoardView room={room} leave={() => void room.leave()} /><footer>WSE Every Game · 보드 대국</footer></main>;
  if (room && view && view.phase !== 'lobby') return <CombatView room={room} view={view} leave={() => void room.leave()} />;
  return <main className={room ? 'app-connected' : ''}>
    {!room ? <><header className="landing-header"><span className="eyebrow">WSE STUDIO / EVERY GAME</span><h1>Every Game <em>Test Arena</em></h1><p>친구와 함께 즐길 게임을 고르세요. 모든 게임은 2인 방에서 진행됩니다.</p></header><section className="layout"><RoomBrowser rooms={rooms} loading={roomsLoading} selectedCode={codeInput} onRefresh={() => void refreshRooms()} onSelect={item => { setCodeInput(item.code); setGame(item.game); setJoinPassword(''); }} /><aside className="panel"><div className="status"><span className={health === 'online' ? 'dot online' : 'dot'} />게임 서버: {health === 'online' ? '연결 가능' : health === 'checking' ? '확인 중' : '연결 불가'}</div><h2>게임 고르기</h2><div className="game-picker">{GAME_CHOICES.map(choice => <button key={choice.id} type="button" aria-pressed={game === choice.id} className={`game-card ${game === choice.id ? 'selected' : ''}`} onClick={() => setGame(choice.id)}><strong>{choice.name}</strong><small>{choice.description}</small></button>)}</div><label>닉네임<input value={nickname} onChange={e => setNickname(e.target.value)} maxLength={16} placeholder="닉네임 입력" /></label><button disabled={busy} onClick={openCreate}>새 방 만들기</button><div className="separator">또는 초대 코드로 참가</div><label>초대 코드<input className="code-input" value={codeInput} onChange={e => setCodeInput(e.target.value.toUpperCase())} maxLength={6} placeholder="ABC123" /></label><label>비밀번호 (비공개 방)<input type="password" value={joinPassword} onChange={e => setJoinPassword(e.target.value)} maxLength={64} placeholder="공개 방이면 비워 두세요" /></label><button className="secondary" disabled={busy} onClick={() => void connect(true)}>방 참가하기</button>{error && <p role="alert" className="error">{error}</p>}</aside></section></> : view?.phase === 'lobby' ? <Lobby room={room} view={view} leave={() => void room.leave()} /> : null}
    <footer>WSE Every Game · 로컬 프로토타입</footer>
  </main>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
