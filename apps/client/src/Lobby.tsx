import type { Room } from '@colyseus/sdk';
import { CHARACTERS, DIFFICULTIES, MAPS, MSG, type CharacterId, type DifficultyId, type GameView, type MapId } from '@wse/shared';

type Props = { room: Room; view: GameView; leave: () => void };
export function Lobby({ room, view, leave }: Props): React.JSX.Element {
  const isHost = view.hostId === room.sessionId;
  const me = view.players.get(room.sessionId);
  const players = [...view.players.entries()];
  return <section className="lobby-screen">
    <div className="lobby-top"><div><span className="eyebrow">READY ROOM / 01</span><h2>출전 준비</h2><p>캐릭터를 고르고 전장을 정하세요. 친구는 초대 코드로 합류할 수 있습니다.</p></div><button className="text-button" onClick={leave}>← 방 나가기</button></div>
    <div className="lobby-layout">
      <aside className="lobby-party">
        <div className="party-title"><span>파티</span><small>{players.length} / 2</small></div>
        {[0, 1].map(index => {
          const entry = players[index]; const player = entry?.[1];
          const selected = player ? CHARACTERS[player.character as CharacterId] ?? CHARACTERS.guardian : null;
          return <div className={`party-slot ${player ? 'occupied' : ''}`} key={index}>
            <div className="party-avatar" style={{ '--avatar': selected ? `#${selected.color.toString(16).padStart(6, '0')}` : '#4d6677' } as React.CSSProperties}>{player ? selected?.name.slice(0, 1) : '+'}</div>
            <div><strong>{player?.nickname ?? '친구를 기다리는 중'}</strong><small>{player ? `${selected?.name} · ${entry[0] === view.hostId ? '방장' : '멤버'}` : '빈 자리'}</small></div>
          </div>;
        })}
        <div className="invite-box"><small>초대 코드</small><div><strong>{room.roomId}</strong><button className="copy-button" onClick={() => void navigator.clipboard.writeText(room.roomId)}>복사</button></div><p>친구에게 이 코드를 알려주세요.</p></div>
        <div className="lobby-start">{isHost ? <button onClick={() => room.send(MSG.START)}>전투 시작 <span>→</span></button> : <p>방장이 전투를 시작할 때까지 기다려 주세요.</p>}<small>혼자서도 바로 시작할 수 있습니다.</small></div>
      </aside>
      <div className="lobby-options">
        <div className="option-section"><div className="section-head"><div><span className="eyebrow">01 / CHARACTER</span><h3>캐릭터 선택</h3></div><small>각자 선택</small></div><div className="character-grid">{(Object.entries(CHARACTERS) as [CharacterId, typeof CHARACTERS[CharacterId]][]).map(([id, character]) => <button key={id} className={`character-card ${me?.character === id ? 'selected' : ''}`} onClick={() => room.send(MSG.CHARACTER, id)}><span className="character-icon" style={{ '--avatar': `#${character.color.toString(16).padStart(6, '0')}` } as React.CSSProperties}>{character.name.slice(0, 1)}</span><strong>{character.name}</strong><small>{character.description}</small><span className="character-stat">체력 {character.hp} · 속도 {character.speed}</span></button>)}</div></div>
        <div className="option-section"><div className="section-head"><div><span className="eyebrow">02 / ARENA</span><h3>맵 선택</h3></div><small>{isHost ? '방장 선택' : '방장이 선택 중'}</small></div><div className="map-grid">{(Object.entries(MAPS) as [MapId, typeof MAPS[MapId]][]).map(([id, map]) => <button key={id} disabled={!isHost} className={`map-card ${view.map === id ? 'selected' : ''}`} onClick={() => room.send(MSG.SETTINGS, { map: id })}><span className="map-preview" style={{ backgroundColor: `#${map.background.toString(16).padStart(6, '0')}`, backgroundImage: `linear-gradient(#${map.grid.toString(16).padStart(6, '0')} 1px, transparent 1px), linear-gradient(90deg, #${map.grid.toString(16).padStart(6, '0')} 1px, transparent 1px)` }} /><strong>{map.name}</strong><small>{map.description}</small></button>)}</div></div>
        <div className="option-section"><div className="section-head"><div><span className="eyebrow">03 / CHALLENGE</span><h3>난이도</h3></div><small>{isHost ? '방장 선택' : '방장이 선택 중'}</small></div><div className="difficulty-grid">{(Object.entries(DIFFICULTIES) as [DifficultyId, typeof DIFFICULTIES[DifficultyId]][]).map(([id, difficulty]) => <button key={id} disabled={!isHost} className={`difficulty-card ${view.difficulty === id ? 'selected' : ''}`} onClick={() => room.send(MSG.SETTINGS, { difficulty: id })}><strong>{difficulty.name}</strong><small>{difficulty.description}</small></button>)}</div></div>
      </div>
    </div>
  </section>;
}
