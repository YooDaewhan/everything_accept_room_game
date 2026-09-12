import { useEffect, useState } from 'react';
import { CHARACTERS, UPGRADES, WEAPON_BRANCHES, weaponCooldown, weaponDamage, weaponLevelDetail, type CharacterId, type PlayerView, type RoleId, type WeaponBranch, type WeaponId } from '@wse/shared';

const weaponIds = (Object.keys(WEAPON_BRANCHES) as WeaponId[]);

export function WeaponCodex({ player, onClose }: { player?: PlayerView; onClose: () => void }): React.JSX.Element {
  const [selected, setSelected] = useState<WeaponId>('basic');
  const [branch, setBranch] = useState<WeaponBranch>('F');
  const character = CHARACTERS[player?.character as CharacterId] ?? CHARACTERS.guardian;
  const role = player?.role as RoleId ?? 'assault';
  const force = player?.upgrades.get('force') ?? 0;
  const cadence = player?.upgrades.get('cadence') ?? 0;
  const ownedLevel = player?.upgrades.get(selected) ?? 0;
  const ownedBranch = player?.evolutions.get(selected);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return <div className="codex-backdrop" role="dialog" aria-modal="true" aria-label="무기 도감">
    <div className="codex-panel">
      <header className="codex-header"><div><span className="eyebrow">WEAPON CODEX / 8 TYPES</span><h2>무기 도감</h2><p>무기를 처음 얻어 LV1이 되면 F/T 타입을 선택합니다. 이후 같은 타입으로 LV10까지 강화됩니다.</p></div><button className="codex-close" onClick={onClose} aria-label="도감 닫기">✕</button></header>
      <div className="codex-content">
        <nav className="codex-list" aria-label="무기 목록">{weaponIds.map(id => <button key={id} className={id === selected ? 'selected' : ''} onClick={() => { setSelected(id); setBranch((player?.evolutions.get(id) === 'T' ? 'T' : 'F')); }}><span>{UPGRADES[id].symbol}</span><strong>{UPGRADES[id].name}</strong><small>{player?.upgrades.get(id) ? `보유 LV${player.upgrades.get(id)}${player.evolutions.get(id) ?? ''}` : '미보유'}</small></button>)}</nav>
        <section className="codex-detail">
          <div className="codex-weapon-head"><div><span className="codex-weapon-symbol">{UPGRADES[selected].symbol}</span><div><h3>{UPGRADES[selected].name}</h3><p>{UPGRADES[selected].description}</p></div></div><small>{ownedLevel > 0 ? `현재 LV${ownedLevel}${ownedBranch ?? ' · 타입 선택 전'}` : '아직 획득하지 않음'}</small></div>
          <div className="codex-branches">{(['F', 'T'] as const).map(value => <button key={value} className={branch === value ? 'selected' : ''} aria-pressed={branch === value} onClick={() => setBranch(value)}><strong>{selected === 'basic' ? '기본 공격' : UPGRADES[selected].name}-{value}</strong><small>{WEAPON_BRANCHES[selected][value]}</small></button>)}</div>
          <p className="codex-note">아래 피해량·공격 주기는 현재 캐릭터, 역할군, 공격력·공격 속도 강화가 반영된 값입니다. 적의 속성 상성에 따라 실제 피해는 달라질 수 있습니다.</p>
          <div className="codex-table-scroll"><table className="codex-table"><thead><tr><th>무기 LV</th><th>피해 / 타격</th><th>발동 주기</th><th>수량 · 범위 · 효과</th></tr></thead><tbody>{Array.from({ length: 10 }, (_, index) => {
            const level = index + 1;
            return <tr key={level} className={ownedLevel === level && ownedBranch === branch ? 'current' : ''}><th>LV {level}</th><td>{selected === 'slowfield' && branch === 'F' ? '—' : weaponDamage(selected, level, character.damage, role, force, branch)}</td><td>{(weaponCooldown(selected, role, cadence, branch) / 1000).toFixed(2)}초</td><td>{weaponLevelDetail(selected, level, branch)}</td></tr>;
          })}</tbody></table></div>
          <p className="codex-footnote">피해는 1회 타격 기준입니다. 궤적·메테오·둔화 영역은 지속 시간 동안 여러 번 적중할 수 있습니다.</p>
        </section>
      </div>
    </div>
  </div>;
}
