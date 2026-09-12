import { useEffect, useRef, useState } from 'react';
import type { Room } from '@colyseus/sdk';
import { CHARACTERS, DIFFICULTIES, GAME, MAPS, ROLES, UPGRADES, type CharacterId, type GameView, type UpgradeId, type WeaponId } from '@wse/shared';
import { GameCanvas } from './game/GameCanvas';
import { LevelUpOverlay } from './LevelUpOverlay';
import { EvolutionOverlay } from './EvolutionOverlay';

type Props = { room: Room; view: GameView; leave: () => void };
const formatTime = (milliseconds: number) => {
  const totalSeconds = Math.floor(milliseconds / 1000);
  return `${String(Math.floor(totalSeconds / 60)).padStart(2, '0')}:${String(totalSeconds % 60).padStart(2, '0')}`;
};

export function CombatView({ room, view, leave }: Props): React.JSX.Element {
  const root = useRef<HTMLDivElement>(null);
  const [browserFullscreen, setBrowserFullscreen] = useState(false);
  const [fullscreenError, setFullscreenError] = useState('');
  const player = view.players.get(room.sessionId);
  const health = player ? Math.max(0, Math.min(100, player.hp / player.maxHp * 100)) : 0;
  const character = CHARACTERS[player?.character as CharacterId] ?? CHARACTERS.guardian;
  const xpProgress = player ? Math.max(0, Math.min(100, player.xp / player.xpToNext * 100)) : 0;
  const weaponIds = (Object.keys(UPGRADES) as UpgradeId[]).filter(id => UPGRADES[id].kind === 'weapon') as WeaponId[];
  const ownedWeapons = weaponIds.filter(id => (player?.upgrades.get(id) ?? 0) > 0);
  const bonuses = (Object.keys(UPGRADES) as UpgradeId[]).filter(id => UPGRADES[id].kind !== 'weapon' && (player?.upgrades.get(id) ?? 0) > 0);
  const zoom = Math.min(window.innerWidth / GAME.viewWidth, window.innerHeight / GAME.viewHeight);
  const visionLevel = player?.upgrades.get('vision') ?? 0;
  const visionRadius = (320 + visionLevel * 70) * zoom;
  const visionX = window.innerWidth / 2;
  const visionY = window.innerHeight / 2;

  useEffect(() => {
    const sync = () => setBrowserFullscreen(document.fullscreenElement === root.current);
    document.addEventListener('fullscreenchange', sync);
    return () => document.removeEventListener('fullscreenchange', sync);
  }, []);

  async function toggleFullscreen(): Promise<void> {
    setFullscreenError('');
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await root.current?.requestFullscreen();
    } catch { setFullscreenError('브라우저 전체 화면을 열 수 없습니다.'); }
  }

  return <div className="combat-screen" ref={root}>
    <GameCanvas room={room} fullscreen />
    <div className="combat-vignette" aria-hidden="true" />
    <div className="combat-fog" aria-hidden="true" style={{ background: `radial-gradient(circle ${visionRadius}px at ${visionX}px ${visionY}px, transparent 65%, rgba(3, 9, 15, .32) 100%)` }} />
    <div className="combat-hud">
      <section className="hud-vitals" aria-label="플레이어 상태">
        <div className="hud-kicker"><span>상태 · {player?.nickname ?? '플레이어'}</span><strong>{player?.hp ?? 0} / {player?.maxHp ?? 0}</strong></div>
        <div className="hud-health-track"><span style={{ width: `${health}%` }} /></div>
        <div className="hud-detail"><span>{character.name} · {ROLES[player?.role ?? 'assault'].name}</span><span>{player?.alive ? '생존 중' : '쓰러짐'}</span></div>
        <div className="hud-xp"><div className="hud-xp-label"><span>LV {player?.level ?? 1} · 경험치</span><strong>{player?.xp ?? 0} / {player?.xpToNext ?? 20}</strong></div><div className="hud-xp-track"><span style={{ width: `${xpProgress}%` }} /></div></div>
      </section>

      <section className="hud-run" aria-label="전투 시간">
        <span className="hud-overline">{MAPS[view.map]?.name ?? '전장'} · {DIFFICULTIES[view.difficulty]?.name ?? '보통'}</span>
        <strong>{formatTime(view.elapsedMs)}</strong>
        <small>생존 시간</small>
      </section>

      <section className="hud-actions" aria-label="전투 정보와 메뉴">
        <div className="hud-kills"><span>처치</span><strong>{String(view.kills).padStart(2, '0')}</strong></div>
        <button onClick={() => void toggleFullscreen()}>{browserFullscreen ? '창 화면' : '전체 화면'}</button>
        <button onClick={leave}>나가기</button>
        {fullscreenError && <span className="fullscreen-error" role="alert">{fullscreenError}</span>}
      </section>

      <section className="hud-inventory" aria-label="6칸 인벤토리">
        <div className="inventory-heading"><span>무기 인벤토리</span><small>{ownedWeapons.length} / 6</small></div>
        <div className="inventory-slots">{Array.from({ length: 6 }, (_, index) => {
          const id = ownedWeapons[index];
          const upgrade = id ? UPGRADES[id] : null;
          return <div className={`inventory-slot ${upgrade ? 'equipped' : ''}`} key={index} title={upgrade ? `${upgrade.name} LV ${player?.upgrades.get(id)}${player?.evolutions.get(id) ? ` · ${player.evolutions.get(id)} 진화` : ''}` : '빈 슬롯'}><small>{index + 1}</small><span>{upgrade?.symbol ?? '+'}</span>{upgrade && <b>{player?.upgrades.get(id)}{player?.evolutions.get(id) ?? ''}</b>}</div>;
        })}</div>
        <span className="inventory-caption">{ownedWeapons.map(id => `${UPGRADES[id].name} LV${player?.upgrades.get(id)}`).join(' · ')}</span>
        {bonuses.length > 0 && <div className="hud-bonuses">{bonuses.map(id => <span key={id}>{UPGRADES[id].symbol} {UPGRADES[id].name} {player?.upgrades.get(id)}</span>)}</div>}
      </section>

      <div className="hud-controls">WASD / 방향키 이동 <span>·</span> 마우스 방향 기본 공격</div>
    </div>
    {player?.pendingUpgrade && player.alive && <LevelUpOverlay room={room} player={player} />}
    {player?.pendingEvolution && player.alive && <EvolutionOverlay room={room} player={player} />}
    {view.phase === 'defeat' && <div className="combat-result"><div><span>RUN ENDED</span><h2>전투 종료</h2><p>모든 플레이어가 쓰러졌습니다.</p><button onClick={leave}>방 나가기</button></div></div>}
  </div>;
}
