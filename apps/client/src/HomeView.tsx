import { BOARD_GAMES, type BoardGameId } from '@wse/shared';
import { RoomBrowser, type RoomListing } from './RoomBrowser';

export type GameChoice = 'survivors' | BoardGameId;

const choices: { id: GameChoice; name: string; note: string; symbol: string }[] = [
  { id: 'survivors', name: '서바이버즈', note: '함께 살아남기', symbol: '✦' },
  { id: 'omok', name: '오목', note: '다섯 돌의 승부', symbol: '●' },
  { id: 'chess', name: '체스', note: '전략적인 한 수', symbol: '♞' },
  { id: 'janggi', name: '장기', note: '한 판의 묘수', symbol: '楚' },
];

type Props = {
  game: GameChoice; nickname: string; code: string; password: string; lockedRoom: RoomListing | null;
  rooms: RoomListing[]; roomsLoading: boolean; health: 'checking' | 'online' | 'offline'; busy: boolean; error: string;
  onGame: (value: GameChoice) => void; onNickname: (value: string) => void; onCode: (value: string) => void; onPassword: (value: string) => void;
  onCreate: () => void; onJoinCode: () => void; onJoinRoom: (room: RoomListing) => void; onRefresh: () => void; onCloseLocked: () => void; onJoinLocked: () => void;
};

export function HomeView({ game, nickname, code, password, lockedRoom, rooms, roomsLoading, health, busy, error, onGame, onNickname, onCode, onPassword, onCreate, onJoinCode, onJoinRoom, onRefresh, onCloseLocked, onJoinLocked }: Props): React.JSX.Element {
  const selectedGame = game === 'survivors' ? '서바이버즈' : BOARD_GAMES[game].name;
  return <main className="home-shell">
    <header className="home-header"><div className="home-brand"><span className="home-brand-mark">✳</span><span>WSE <b>EVERY GAME</b></span></div><span className={`home-server ${health}`}><i />{health === 'online' ? '서버 연결됨' : health === 'checking' ? '연결 확인 중' : '서버 연결 불가'}</span></header>
    <section className="home-hero">
      <div className="home-intro"><span className="home-kicker">MULTIPLAYER / PLAY TOGETHER</span><h1>친구와의 한 판,<br /><em>여기서 시작.</em></h1><p>게임을 고르고 방을 만들거나, 열린 방에 바로 들어가세요.<br />복잡한 준비 없이 함께 플레이할 수 있습니다.</p><div className="home-orbit" aria-hidden="true"><span>♞</span><span>●</span><span>楚</span></div></div>
      <div className="home-create-card"><div className="home-card-heading"><span>01 / PLAY</span><strong>새 게임 시작</strong></div><label className="home-name-label">플레이어 이름<input autoComplete="nickname" value={nickname} onChange={event => onNickname(event.target.value)} maxLength={16} placeholder="이름을 입력하세요" /></label><div className="home-game-choice" role="group" aria-label="게임 선택">{choices.map(choice => <button key={choice.id} type="button" aria-pressed={game === choice.id} className={`home-game-card ${game === choice.id ? 'selected' : ''}`} onClick={() => onGame(choice.id)}><span>{choice.symbol}</span><strong>{choice.name}</strong><small>{choice.note}</small></button>)}</div><button className="home-create-button" type="button" disabled={busy} onClick={onCreate}>{selectedGame} 방 만들기 <span>↗</span></button><p>방 코드는 즉시 생성됩니다. 제목과 비밀번호는 준비 화면에서 설정하세요.</p></div>
    </section>
    <section className="home-bottom"><RoomBrowser rooms={rooms} loading={roomsLoading} onRefresh={onRefresh} onJoin={onJoinRoom} /><aside className="home-code-card"><span className="eyebrow">HAVE A CODE?</span><h2>초대 코드로 입장</h2><p>친구가 보낸 6자리 코드를 입력하세요.</p><label>방 코드<input className="code-input" value={code} onChange={event => onCode(event.target.value.toUpperCase())} maxLength={6} placeholder="ABC123" /></label><label>비밀번호 <small>선택</small><input type="password" value={password} onChange={event => onPassword(event.target.value)} maxLength={64} placeholder="공개 방이면 비워 두세요" /></label><button type="button" disabled={busy} onClick={onJoinCode}>코드로 입장 <span>↗</span></button><div className="home-code-tip">열린 방은 왼쪽 목록에서 누르면 바로 입장할 수 있습니다.</div></aside></section>
    {error && <p className="home-error" role="alert">{error}</p>}
    <footer>WSE EVERY GAME <span>© WSE STUDIO</span></footer>
    {lockedRoom && <div className="home-dialog-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onCloseLocked(); }}><div className="home-dialog" role="dialog" aria-modal="true" aria-labelledby="join-locked-title"><span className="eyebrow">PRIVATE ROOM</span><h2 id="join-locked-title">{lockedRoom.title}</h2><p>이 방에 들어가려면 비밀번호가 필요합니다.</p><input type="password" autoFocus value={password} onChange={event => onPassword(event.target.value)} maxLength={64} placeholder="방 비밀번호" onKeyDown={event => { if (event.key === 'Enter') onJoinLocked(); }} /><div className="home-dialog-actions"><button type="button" className="secondary" onClick={onCloseLocked}>취소</button><button type="button" disabled={busy || !password} onClick={onJoinLocked}>입장하기 ↗</button></div>{error && <p className="error" role="alert">{error}</p>}</div></div>}
  </main>;
}
