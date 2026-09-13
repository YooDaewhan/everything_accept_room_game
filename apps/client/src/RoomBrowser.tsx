import { BOARD_GAMES, MAPS, type BoardGameId, type MapId } from '@wse/shared';

export type RoomListing = { code: string; title: string; game: 'survivors' | BoardGameId; players: number; maxPlayers: number; locked: boolean; map?: MapId };

type Props = { rooms: RoomListing[]; loading: boolean; selectedCode: string; onRefresh: () => void; onSelect: (room: RoomListing) => void };

export function RoomBrowser({ rooms, loading, selectedCode, onRefresh, onSelect }: Props): React.JSX.Element {
  return <section className="stage room-browser">
    <div className="room-browser-ambient" aria-hidden="true"><span className="ambient-ring" /><span className="ambient-spark one">✦</span><span className="ambient-spark two">✧</span><span className="ambient-spark three">✦</span></div>
    <div className="room-browser-content">
      <div className="room-browser-head"><div><span className="eyebrow">WSE / LIVE LOBBY</span><h2>함께할 방을 찾으세요</h2><p>서바이버즈, 오목, 체스, 장기. 지금 열려 있는 방입니다.</p></div><button type="button" className="room-refresh" onClick={onRefresh} disabled={loading}>{loading ? '불러오는 중…' : '↻ 새로고침'}</button></div>
      <div className="room-browser-bar"><span><i /> 참가 가능한 방 <strong>{rooms.length}</strong></span><small>목록은 새로고침할 때 갱신됩니다</small></div>
      {rooms.length === 0 ? <div className="empty-rooms"><span className="empty-rooms-mark">✧</span><strong>Test Arena</strong><p>오른쪽에서 새 방을 만들고 친구를 초대해 보세요.</p></div> : <div className="room-list">{rooms.map(item => <button key={item.code} type="button" aria-pressed={selectedCode === item.code} className={`room-list-item ${selectedCode === item.code ? 'selected' : ''}`} onClick={() => onSelect(item)}><span className={`room-game-icon ${item.game}`}>{item.game === 'survivors' ? '✦' : item.game === 'omok' ? '●' : item.game === 'chess' ? '♞' : '楚'}</span><span className="room-list-detail"><strong>{item.title}</strong><small>{item.game === 'survivors' ? '서바이버즈' : BOARD_GAMES[item.game].name}{item.map ? ` · ${MAPS[item.map].name}` : ''}</small></span><span className="room-list-meta"><b>{item.locked ? '잠금' : '공개'}</b><strong>{item.players}/{item.maxPlayers}</strong><small>{item.code}</small></span></button>)}</div>}
    </div>
  </section>;
}
