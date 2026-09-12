import type { Room } from '@colyseus/sdk';
import { MSG, UPGRADES, type PlayerView, type UpgradeId } from '@wse/shared';

const categoryName = { weapon: '무기', passive: '패시브', special: '특수' };

export function LevelUpOverlay({ room, player }: { room: Room; player: PlayerView }): React.JSX.Element {
  const choices = [player.choice0, player.choice1, player.choice2];
  return <div className="levelup-backdrop" role="dialog" aria-modal="true" aria-label="레벨업 강화 선택">
    <div className="levelup-panel">
      <div className="levelup-heading"><span>LEVEL UP / {String(player.level).padStart(2, '0')}</span><h2>강화를 선택하세요</h2><p>선택 중 무적이며, 선택 후에도 3초간 보호됩니다. 다른 플레이어의 전투는 계속됩니다.</p></div>
      <div className="levelup-choices">{choices.map((rawId, index) => {
        const id = rawId as UpgradeId;
        const upgrade = UPGRADES[id];
        if (!upgrade) return null;
        const current = player.upgrades.get(id) ?? 0;
        return <button key={id} className={`levelup-card ${upgrade.kind}`} onClick={() => room.send(MSG.UPGRADE, index)}>
          <span className="levelup-category">{categoryName[upgrade.kind]}</span>
          <span className="levelup-symbol">{upgrade.symbol}</span>
          <strong>{upgrade.name}</strong>
          <small>{upgrade.description}</small>
          <span className="levelup-next">{current === 0 ? '새로 획득' : `LV ${current} → LV ${current + 1}`}</span>
        </button>;
      })}</div>
      <div className="levelup-footer">3개 중 하나를 선택하세요</div>
    </div>
  </div>;
}
