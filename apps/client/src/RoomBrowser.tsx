import { BOARD_GAMES, MAPS, type BoardGameId, type MapId } from '@wse/shared';

export type RoomListing = { code: string; title: string; game: 'survivors' | BoardGameId; players: number; maxPlayers: number; locked: boolean; map?: MapId };

type Props = { rooms: RoomListing[]; loading: boolean; onRefresh: () => void; onJoin: (room: RoomListing) => void };

export function RoomBrowser({ rooms, loading, onRefresh, onJoin }: Props): React.JSX.Element {
  return <section className="stage room-browser home-room-browser">
    <div className="room-browser-ambient" aria-hidden="true"><span className="ambient-ring" /><span className="ambient-spark one">✦</span><span className="ambient-spark two">✧</span><span className="ambient-spark three">✦</span></div>
    <div className="room-browser-content">
      <div className="room-browser-head"><div><span className="eyebrow">OPEN TABLES / LIVE</span><h2>지금 열린 방</h2><p>마음에 드는 방을 고르면 바로 입장합니다.</p></div><button type="button" className="room-refresh" onClick={onRefresh} disabled={loading}>{loading ? '확인 중…' : '↻ 목록 새로고침'}</button></div>
      <div className="room-browser-bar"><span><i /> 입장 가능한 방 <strong>{rooms.length}</strong></span><small>새로고침할 때 갱신</small></div>
      {rooms.length === 0 ? <div className="empty-rooms"><span className="empty-rooms-mark">✳</span><strong>Test Arena</strong><p>첫 방을 만들고 친구를 초대해 보세요.</p></div> : <div className="room-list">{rooms.map(item => <button key={item.code} type="button" className="room-list-item" onClick={() => onJoin(item)}><span className={`room-game-icon ${item.game}`}>{item.game === 'survivors' ? '✦' : item.game === 'omok' ? '●' : item.game === 'chess' ? '♞' : '楚'}</span><span className="room-list-detail"><strong>{item.title}</strong><small>{item.game === 'survivors' ? '서바이버즈' : BOARD_GAMES[item.game].name}{item.map ? ` · ${MAPS[item.map].name}` : ''} · {item.code}</small></span><span className="room-list-meta"><b>{item.locked ? '비밀번호' : '공개'}</b><strong>{item.players}/{item.maxPlayers}</strong><small>{item.locked ? '입력 후 입장 ↗' : '바로 입장 ↗'}</small></span></button>)}</div>}
    </div>
  </section>;
}
