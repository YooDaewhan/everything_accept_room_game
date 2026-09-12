import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Client, type Room } from '@colyseus/sdk';
import { CHARACTERS, DIFFICULTIES, MAPS, NICKNAME_PATTERN, ROOM_NAME, type CharacterId, type DifficultyId, type GameView, type MapId } from '@wse/shared';
import { GameCanvas } from './game/GameCanvas';
import { Lobby } from './Lobby';
import { CreateRoom } from './CreateRoom';
import './style.css';

const serverUrl = import.meta.env.VITE_GAME_SERVER_URL ?? 'http://localhost:2567';
const client = new Client(serverUrl);

function App(): React.JSX.Element {
  const [nickname, setNickname] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [room, setRoom] = useState<Room | null>(null);
  const [view, setView] = useState<GameView | null>(null);
  const [health, setHealth] = useState<'checking' | 'online' | 'offline'>('checking');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const [map, setMap] = useState<MapId>('ruins');
  const [difficulty, setDifficulty] = useState<DifficultyId>('normal');

  useEffect(() => { fetch(`${serverUrl}/health`).then(r => { if (!r.ok) throw new Error(); setHealth('online'); }).catch(() => setHealth('offline')); }, []);
  useEffect(() => {
    if (!room) return;
    const sync = () => {
      const state = room.state as GameView;
      if (!state?.players) return;
      setView({ code: state.code, phase: state.phase, hostId: state.hostId, map: state.map, difficulty: state.difficulty,
        players: new Map([...state.players].map(([id, player]) => [id, { nickname: player.nickname, character: player.character, x: player.x, y: player.y, hp: player.hp, maxHp: player.maxHp, xp: player.xp, alive: player.alive }])),
        monsters: new Map(state.monsters), projectiles: new Map(state.projectiles), gems: new Map(state.gems) });
    };
    room.onStateChange(sync);
    room.onLeave(() => { setRoom(null); setView(null); setError('방 연결이 종료되었습니다.'); });
    sync();
    return () => { room.onStateChange.remove(sync); };
  }, [room]);

  async function connect(join: boolean): Promise<void> {
    const name = nickname.trim();
    if (!NICKNAME_PATTERN.test(name)) { setError('닉네임은 2~16자의 문자, 숫자, 공백, _ 또는 -만 사용할 수 있습니다.'); return; }
    if (join && !/^[A-Z2-9]{6}$/.test(codeInput.trim().toUpperCase())) { setError('초대 코드는 6자리입니다.'); return; }
    setBusy(true); setError('');
    try { setRoom(join ? await client.joinById(codeInput.trim().toUpperCase(), { nickname: name }) : await client.create(ROOM_NAME, { nickname: name, map, difficulty })); setCreating(false); }
    catch (cause) { setError(join ? `참가 실패: 방이 없거나 가득 찼습니다. (${String(cause)})` : `방 생성 실패: ${String(cause)}`); }
    finally { setBusy(false); }
  }

  function openCreate(): void {
    if (!NICKNAME_PATTERN.test(nickname.trim())) { setError('먼저 2~16자의 닉네임을 입력해 주세요.'); return; }
    setError(''); setCreating(true);
  }

  const me = room && view?.players.get(room.sessionId);
  return <main className={room ? 'app-connected' : ''}>
    {!room ? creating ? <CreateRoom map={map} difficulty={difficulty} onMap={setMap} onDifficulty={setDifficulty} onBack={() => { setCreating(false); setError(''); }} onCreate={() => void connect(false)} busy={busy} error={error} /> : <><header className="landing-header"><span className="eyebrow">WSE STUDIO / CO-OP SURVIVAL</span><h1>Survivors <em>Test Arena</em></h1><p>친구와 함께 전장에 입장하세요. 최대 2명이 같은 방에서 생존합니다.</p></header><section className="layout"><div className="stage"><GameCanvas room={null} /></div><aside className="panel"><div className="status"><span className={health === 'online' ? 'dot online' : 'dot'} />게임 서버: {health === 'online' ? '연결 가능' : health === 'checking' ? '확인 중' : '연결 불가'}</div><h2>방에 들어가기</h2><label>닉네임<input value={nickname} onChange={e => setNickname(e.target.value)} maxLength={16} placeholder="닉네임 입력" /></label><button disabled={busy} onClick={openCreate}>새 방 만들기</button><div className="separator">또는 초대 코드로 참가</div><label>초대 코드<input className="code-input" value={codeInput} onChange={e => setCodeInput(e.target.value.toUpperCase())} maxLength={6} placeholder="ABC123" /></label><button className="secondary" disabled={busy} onClick={() => void connect(true)}>방 참가하기</button>{error && <p role="alert" className="error">{error}</p>}</aside></section></> : view?.phase === 'lobby' ? <Lobby room={room} view={view} leave={() => void room.leave()} /> : <><div className="combat-top"><div><span className="eyebrow">LIVE RUN / {room.roomId}</span><h2>{MAPS[view?.map as MapId]?.name ?? '전장'} <em>· {DIFFICULTIES[view?.difficulty as DifficultyId]?.name ?? '보통'}</em></h2></div><button className="text-button" onClick={() => void room.leave()}>← 방 나가기</button></div><section className="layout"><div className="stage"><GameCanvas room={room} /></div><aside className="panel combat-panel"><div className="status"><span className="dot online" />{view?.phase === 'defeat' ? '전투 종료' : '전투 진행 중'}</div><h2>{me?.nickname ?? '플레이어'}</h2><p>{CHARACTERS[me?.character as CharacterId]?.name ?? '수호자'}</p><div className="combat-stat"><small>체력</small><strong>{me?.hp ?? 0} / {me?.maxHp ?? 0}</strong></div><div className="combat-stat"><small>경험치</small><strong>{me?.xp ?? 0}</strong></div><p className="hint">WASD 또는 방향키로 이동 · 공격은 자동</p>{view?.phase === 'defeat' && <div className="defeat-message">모든 플레이어가 쓰러졌습니다.</div>}</aside></section></>}
    <footer>WSE Survivors · 로컬 전투 프로토타입</footer>
  </main>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
