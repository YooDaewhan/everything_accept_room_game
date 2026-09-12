import type { Room } from '@colyseus/sdk';
import { MSG, UPGRADES, WEAPON_BRANCHES, weaponLevelDetail, type PlayerView, type WeaponId } from '@wse/shared';

export function EvolutionOverlay({ room, player }: { room: Room; player: PlayerView }): React.JSX.Element {
  const id = player.pendingEvolution as WeaponId;
  const weapon = UPGRADES[id];
  const descriptions = WEAPON_BRANCHES[id];
  if (!weapon || !descriptions) return <></>;
  return <div className="levelup-backdrop" role="dialog" aria-modal="true" aria-label="무기 타입 선택">
    <div className="levelup-panel evolution-panel">
      <div className="levelup-heading"><span>WEAPON TYPE / LV 1</span><h2>{weapon.name} 타입 선택</h2><p>처음 획득한 무기의 F/T 타입을 정합니다. 선택하는 동안 무적입니다.</p></div>
      <div className="levelup-choices evolution-choices">{(['F', 'T'] as const).map(branch => <button key={branch} className="levelup-card weapon" onClick={() => room.send(MSG.EVOLUTION, branch)}><span className="levelup-category">{branch} 타입</span><span className="levelup-symbol">{branch === 'F' ? '↗' : '✦'}</span><strong>{weapon.name}-{branch}</strong><small>{descriptions[branch]}</small><span className="levelup-next">LV1: {weaponLevelDetail(id, 1, branch)} · 선택 후 3초간 무적</span></button>)}</div>
    </div>
  </div>;
}
