import { useEffect, useRef, useState } from 'react';
import type { Room } from '@colyseus/sdk';
import { CHARACTERS, DIFFICULTIES, MAPS, type CharacterId, type GameView } from '@wse/shared';
import { GameCanvas } from './game/GameCanvas';

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
    <div className="combat-hud">
      <section className="hud-vitals" aria-label="플레이어 상태">
        <div className="hud-kicker"><span>상태 · {player?.nickname ?? '플레이어'}</span><strong>{player?.hp ?? 0} / {player?.maxHp ?? 0}</strong></div>
        <div className="hud-health-track"><span style={{ width: `${health}%` }} /></div>
        <div className="hud-detail"><span>{character.name}</span><span>{player?.alive ? '생존 중' : '쓰러짐'}</span></div>
        <div className="hud-xp"><span>경험치</span><strong>{player?.xp ?? 0} XP</strong></div>
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
        <div className="inventory-heading"><span>인벤토리</span><small>1 / 6</small></div>
        <div className="inventory-slots">{Array.from({ length: 6 }, (_, index) => <div className={`inventory-slot ${index === 0 ? 'equipped' : ''}`} key={index} title={index === 0 ? '기본 자동 공격' : '빈 슬롯'}><small>{index + 1}</small><span>{index === 0 ? '✦' : '+'}</span></div>)}</div>
        <span className="inventory-caption">기본 무기 · 자동 공격</span>
      </section>

      <div className="hud-controls">WASD / 방향키 이동 <span>·</span> 공격 자동</div>
    </div>
    {view.phase === 'defeat' && <div className="combat-result"><div><span>RUN ENDED</span><h2>전투 종료</h2><p>모든 플레이어가 쓰러졌습니다.</p><button onClick={leave}>방 나가기</button></div></div>}
  </div>;
}
