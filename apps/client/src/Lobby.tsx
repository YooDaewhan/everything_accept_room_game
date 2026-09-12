import type { Room } from '@colyseus/sdk';
import { CHARACTERS, DIFFICULTIES, MAPS, MSG, ROLES, type CharacterId, type GameView, type RoleId } from '@wse/shared';

type Props = { room: Room; view: GameView; leave: () => void };
export function Lobby({ room, view, leave }: Props): React.JSX.Element {
  const isHost = view.hostId === room.sessionId;
  const me = view.players.get(room.sessionId);
  const players = [...view.players.entries()];
  return <section className="lobby-screen">
    <div className="lobby-top"><div><span className="eyebrow">READY ROOM / CHARACTER SELECT</span><h2>출전 준비</h2><p>각자 캐릭터를 선택하세요. 방장이 정한 전장과 난이도로 함께 출전합니다.</p></div><button className="text-button" onClick={leave}>← 방 나가기</button></div>
    <div className="lobby-layout">
      <aside className="lobby-party">
        <div className="party-title"><span>파티</span><small>{players.length} / 2</small></div>
        {[0, 1].map(index => {
          const entry = players[index]; const player = entry?.[1];
          const selected = player ? CHARACTERS[player.character as CharacterId] ?? CHARACTERS.guardian : null;
          return <div className={`party-slot ${player ? 'occupied' : ''}`} key={index}>
            <div className="party-avatar" style={{ '--avatar': selected ? `#${selected.color.toString(16).padStart(6, '0')}` : '#4d6677' } as React.CSSProperties}>{player ? selected?.name.slice(0, 1) : '+'}</div>
            <div><strong>{player?.nickname ?? '친구를 기다리는 중'}</strong><small>{player ? `${selected?.name} · ${ROLES[player.role]?.name ?? '공격'} · ${entry[0] === view.hostId ? '방장' : '멤버'}` : '빈 자리'}</small></div>
          </div>;
        })}
        <div className="invite-box"><small>초대 코드</small><div><strong>{room.roomId}</strong><button className="copy-button" onClick={() => void navigator.clipboard.writeText(room.roomId)}>복사</button></div><p>친구에게 이 코드를 알려주세요.</p></div>
        <div className="lobby-start">{isHost ? <button onClick={() => room.send(MSG.START)}>전투 시작 <span>→</span></button> : <p>방장이 전투를 시작할 때까지 기다려 주세요.</p>}<small>{isHost ? '혼자서도 바로 시작할 수 있습니다.' : '캐릭터를 선택하고 기다려 주세요.'}</small></div>
      </aside>
      <div className="lobby-options">
        <div className="option-section character-section"><div className="section-head"><div><span className="eyebrow">YOUR HERO / SELECT ONE</span><h3>캐릭터 선택</h3></div><small>각자 선택</small></div><div className="character-grid">{(Object.entries(CHARACTERS) as [CharacterId, typeof CHARACTERS[CharacterId]][]).map(([id, character]) => <button key={id} aria-pressed={me?.character === id} className={`character-card ${me?.character === id ? 'selected' : ''}`} onClick={() => room.send(MSG.CHARACTER, id)}><span className="character-icon" style={{ '--avatar': `#${character.color.toString(16).padStart(6, '0')}` } as React.CSSProperties}>{character.name.slice(0, 1)}</span><span className="character-choice">{me?.character === id ? '선택됨' : '선택하기'}</span><strong>{character.name}</strong><small>{character.description}</small><span className="character-stat">체력 {character.hp} · 속도 {character.speed} · 공격 {character.damage}</span></button>)}</div></div>
        <div className="option-section role-section"><div className="section-head"><div><span className="eyebrow">YOUR ROLE / SELECT ONE</span><h3>역할군 선택</h3></div><small>각자 선택</small></div><div className="role-grid">{(Object.entries(ROLES) as [RoleId, typeof ROLES[RoleId]][]).map(([id, role]) => <button key={id} aria-pressed={me?.role === id} className={`role-card ${me?.role === id ? 'selected' : ''}`} onClick={() => room.send(MSG.ROLE, id)}><strong>{role.name}</strong><small>{role.description}</small></button>)}</div></div>
        <div className="arena-summary"><div><span className="eyebrow">ROOM RULES / FIXED</span><h3>이번 전장</h3><p>방을 만들 때 정한 설정입니다.</p></div><div className="summary-tags"><span>맵 <strong>{MAPS[view.map]?.name ?? '폐허'}</strong></span><span>난이도 <strong>{DIFFICULTIES[view.difficulty]?.name ?? '보통'}</strong></span></div></div>
      </div>
    </div>
  </section>;
}
