import { DIFFICULTIES, MAPS, type DifficultyId, type MapId } from '@wse/shared';

type Props = { map: MapId; difficulty: DifficultyId; onMap: (value: MapId) => void; onDifficulty: (value: DifficultyId) => void; onBack: () => void; onCreate: () => void; busy: boolean; error: string };
export function CreateRoom({ map, difficulty, onMap, onDifficulty, onBack, onCreate, busy, error }: Props): React.JSX.Element {
  return <section className="setup-screen">
    <div className="lobby-top"><div><span className="eyebrow">CREATE ROOM / SETUP</span><h2>새 방 만들기</h2><p>전장과 난이도를 정한 뒤 방을 만드세요. 방에 들어간 뒤에는 변경할 수 없습니다.</p></div><button className="text-button" onClick={onBack}>← 돌아가기</button></div>
    <div className="setup-columns">
      <div className="option-section"><div className="section-head"><div><span className="eyebrow">01 / ARENA</span><h3>맵 선택</h3></div></div><div className="map-grid">{(Object.entries(MAPS) as [MapId, typeof MAPS[MapId]][]).map(([id, option]) => <button key={id} type="button" aria-pressed={map === id} className={`map-card ${map === id ? 'selected' : ''}`} onClick={() => onMap(id)}><span className="map-preview" style={{ backgroundColor: `#${option.background.toString(16).padStart(6, '0')}`, backgroundImage: `linear-gradient(#${option.grid.toString(16).padStart(6, '0')} 1px, transparent 1px), linear-gradient(90deg, #${option.grid.toString(16).padStart(6, '0')} 1px, transparent 1px)` }} /><strong>{option.name}</strong><small>{option.description}</small></button>)}</div></div>
      <div className="option-section"><div className="section-head"><div><span className="eyebrow">02 / CHALLENGE</span><h3>난이도 선택</h3></div></div><div className="difficulty-grid">{(Object.entries(DIFFICULTIES) as [DifficultyId, typeof DIFFICULTIES[DifficultyId]][]).map(([id, option]) => <button key={id} type="button" aria-pressed={difficulty === id} className={`difficulty-card ${difficulty === id ? 'selected' : ''}`} onClick={() => onDifficulty(id)}><strong>{option.name}</strong><small>{option.description}</small></button>)}</div></div>
    </div>
    <div className="setup-footer"><span>선택한 규칙: {MAPS[map].name} · {DIFFICULTIES[difficulty].name}</span><button disabled={busy} onClick={onCreate}>방 만들고 캐릭터 선택 →</button></div>
    {error && <p className="error" role="alert">{error}</p>}
  </section>;
}
