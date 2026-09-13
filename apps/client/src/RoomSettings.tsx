import { useEffect, useState } from 'react';
import { DIFFICULTIES, MAPS, type DifficultyId, type MapId } from '@wse/shared';

type Props = { title: string; locked: boolean; map?: MapId; difficulty?: DifficultyId; onSave: (settings: { title: string; password?: string; map?: MapId; difficulty?: DifficultyId }) => void };

export function RoomSettings({ title, locked, map, difficulty, onSave }: Props): React.JSX.Element {
  const [draftTitle, setDraftTitle] = useState(title);
  const [password, setPassword] = useState('');
  const [passwordChanged, setPasswordChanged] = useState(false);
  const [draftMap, setDraftMap] = useState(map);
  const [draftDifficulty, setDraftDifficulty] = useState(difficulty);
  const [saved, setSaved] = useState(false);
  useEffect(() => { setDraftTitle(title); }, [title]);
  useEffect(() => { setDraftMap(map); }, [map]);
  useEffect(() => { setDraftDifficulty(difficulty); }, [difficulty]);

  function save(): void {
    if (!draftTitle.trim()) return;
    onSave({ title: draftTitle.trim(), ...(passwordChanged ? { password } : {}), ...(draftMap ? { map: draftMap } : {}), ...(draftDifficulty ? { difficulty: draftDifficulty } : {}) });
    setPassword(''); setPasswordChanged(false); setSaved(true);
  }

  return <div className="option-section ready-settings">
    <div className="section-head"><div><span className="eyebrow">ROOM / SETTINGS</span><h3>방 설정</h3></div></div>
    <div className="room-fields"><label>방 제목<input value={draftTitle} onChange={event => { setDraftTitle(event.target.value); setSaved(false); }} maxLength={40} /></label><label>{locked ? '비밀번호 변경' : '비밀번호 설정'}<input type="password" value={password} onChange={event => { setPassword(event.target.value); setPasswordChanged(true); setSaved(false); }} maxLength={64} placeholder={locked ? '기존 비밀번호 유지' : '비워 두면 공개 방'} autoComplete="new-password" /></label></div>
    {locked && <button type="button" className="room-unlock" onClick={() => { setPassword(''); setPasswordChanged(true); setSaved(false); }}>비밀번호 해제</button>}
    {map && draftMap && <div className="ready-rule-fields"><label>맵<select value={draftMap} onChange={event => setDraftMap(event.target.value as MapId)}>{(Object.entries(MAPS) as [MapId, typeof MAPS[MapId]][]).map(([id, option]) => <option key={id} value={id}>{option.name}</option>)}</select></label><label>난이도<select value={draftDifficulty} onChange={event => setDraftDifficulty(event.target.value as DifficultyId)}>{(Object.entries(DIFFICULTIES) as [DifficultyId, typeof DIFFICULTIES[DifficultyId]][]).map(([id, option]) => <option key={id} value={id}>{option.name}</option>)}</select></label></div>}
    <div className="ready-settings-footer"><span>{saved ? '설정을 저장했습니다.' : `${locked ? '비공개' : '공개'} 방`}</span><button type="button" onClick={save} disabled={!draftTitle.trim()}>설정 저장</button></div>
  </div>;
}
