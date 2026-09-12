import type { Room } from '@colyseus/sdk';
import { MSG, UPGRADES, type PlayerView, type WeaponId } from '@wse/shared';

const branches: Record<WeaponId, [string, string]> = {
  orbit: ['공전 속도 증가', '크기와 피해 증가'],
  basic: ['공격 속도 증가', '공격력 증가'],
  trail: ['궤적 폭과 지속 시간 증가', '궤적 피해 증가'],
  pet: ['발사 탄환 수 증가', '명중 시 폭발'],
  meteor: ['낙하 개수 증가', '피격 지점에 속성 지역 생성'],
  slowfield: ['범위 안 적 공격력·방어력 약화', '범위 안 적 지속 피해'],
  bounce: ['도탄 횟수 증가', '도탄 시 폭발'],
  cannon: ['발사 탄환 수 증가', '전방위 발사'],
};

export function EvolutionOverlay({ room, player }: { room: Room; player: PlayerView }): React.JSX.Element {
  const id = player.pendingEvolution as WeaponId;
  const weapon = UPGRADES[id];
  const descriptions = branches[id];
  if (!weapon || !descriptions) return <></>;
  return <div className="levelup-backdrop" role="dialog" aria-modal="true" aria-label="무기 진화 선택">
    <div className="levelup-panel evolution-panel">
      <div className="levelup-heading"><span>WEAPON EVOLUTION / LV 5</span><h2>{weapon.name} 진화</h2><p>두 방향 중 하나를 선택하세요. 선택하는 동안 무적입니다.</p></div>
      <div className="levelup-choices evolution-choices">{(['F', 'T'] as const).map((branch, index) => <button key={branch} className="levelup-card weapon" onClick={() => room.send(MSG.EVOLUTION, branch)}><span className="levelup-category">{branch} 진화</span><span className="levelup-symbol">{branch === 'F' ? '↗' : '✦'}</span><strong>{weapon.name}-{branch}</strong><small>{descriptions[index]}</small><span className="levelup-next">선택 후 3초간 무적</span></button>)}</div>
    </div>
  </div>;
}
