import { useEffect, useRef } from 'react';
import type { Room } from '@colyseus/sdk';
import Phaser from 'phaser';
import { CHARACTERS, GAME, MAPS, MSG, type CharacterId, type MapId, type GameView, type EntityView } from '@wse/shared';

class ArenaScene extends Phaser.Scene {
  private graphics!: Phaser.GameObjects.Graphics;
  private keys?: Record<string, Phaser.Input.Keyboard.Key>;
  private lastSent = 0;
  private rendered = new Map<string, EntityView>();
  constructor(private room: Room | null) { super('arena'); }
  create(): void {
    this.graphics = this.add.graphics();
    if (this.input.keyboard) this.keys = this.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT') as Record<string, Phaser.Input.Keyboard.Key>;
    if (!this.room) this.add.text(GAME.width / 2, GAME.height / 2, 'WSE SURVIVORS · TEST ARENA', { fontFamily: 'Arial', fontSize: '20px', color: '#a8c7d8' }).setOrigin(.5);
    this.events.once('shutdown', () => { this.rendered.clear(); });
  }
  update(time: number): void {
    const g = this.graphics;
    const map = this.room ? (MAPS[(this.room.state as GameView)?.map as MapId] ?? MAPS.ruins) : MAPS.ruins;
    g.clear(); g.fillStyle(map.background); g.fillRect(0, 0, GAME.width, GAME.height);
    g.lineStyle(1, map.grid, 0.7);
    for (let x = 0; x < GAME.width; x += 48) g.lineBetween(x, 0, x, GAME.height);
    for (let y = 0; y < GAME.height; y += 48) g.lineBetween(0, y, GAME.width, y);
    if (!this.room) return;
    const state = this.room.state as GameView;
    if (!state?.players) return;
    if (state.phase === 'running' && this.keys && time - this.lastSent >= GAME.tickMs) {
      this.lastSent = time;
      const k = this.keys;
      let x = Number(k.D.isDown || k.RIGHT.isDown) - Number(k.A.isDown || k.LEFT.isDown);
      let y = Number(k.S.isDown || k.DOWN.isDown) - Number(k.W.isDown || k.UP.isDown);
      const length = Math.hypot(x, y);
      if (length > 1) { x /= length; y /= length; }
      this.room.send(MSG.INPUT, { x, y });
    }
    const alive = new Set<string>();
    for (const [id, gem] of state.gems) {
      const p = this.smooth(`g${id}`, gem, alive);
      g.fillStyle(0x6ee6a9); g.fillTriangle(p.x, p.y - 9, p.x + 7, p.y, p.x, p.y + 9); g.fillTriangle(p.x, p.y - 9, p.x - 7, p.y, p.x, p.y + 9);
    }
    for (const [id, bullet] of state.projectiles) { const p = this.smooth(`b${id}`, bullet, alive); g.fillStyle(0xffe08a); g.fillCircle(p.x, p.y, GAME.projectileRadius); }
    for (const [id, monster] of state.monsters) {
      const p = this.smooth(`m${id}`, monster, alive);
      g.fillStyle(0xe86873); g.fillCircle(p.x, p.y, GAME.monsterRadius);
      g.fillStyle(0x283444); g.fillRect(p.x - 17, p.y - 27, 34, 5);
      g.fillStyle(0xff9698); g.fillRect(p.x - 17, p.y - 27, 34 * monster.hp / monster.maxHp, 5);
    }
    for (const [id, player] of state.players) {
      const p = this.smooth(`p${id}`, player, alive);
      g.fillStyle(player.alive ? (CHARACTERS[player.character as CharacterId] ?? CHARACTERS.guardian).color : 0x5b6775);
      g.fillCircle(p.x, p.y, GAME.playerRadius);
      g.lineStyle(2, 0xffffff, .75); g.strokeCircle(p.x, p.y, GAME.playerRadius + 2);
      g.fillStyle(0x283444); g.fillRect(p.x - 22, p.y - 28, 44, 5);
      g.fillStyle(0x6ee6a9); g.fillRect(p.x - 22, p.y - 28, 44 * player.hp / player.maxHp, 5);
    }
    for (const id of this.rendered.keys()) if (!alive.has(id)) this.rendered.delete(id);
  }
  private smooth(id: string, target: EntityView, alive: Set<string>): EntityView {
    alive.add(id);
    const current = this.rendered.get(id) ?? { x: target.x, y: target.y };
    current.x += (target.x - current.x) * 0.35;
    current.y += (target.y - current.y) * 0.35;
    this.rendered.set(id, current);
    return current;
  }
}
export function GameCanvas({ room }: { room: Room | null }): React.JSX.Element {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!host.current) return;
    const game = new Phaser.Game({ type: Phaser.AUTO, parent: host.current, width: GAME.width, height: GAME.height, backgroundColor: '#101a28', scene: new ArenaScene(room) });
    const stop = () => { if (room) room.send(MSG.INPUT, { x: 0, y: 0 }); };
    window.addEventListener('blur', stop);
    return () => { window.removeEventListener('blur', stop); game.destroy(true); };
  }, [room]);
  return <div className="game-canvas" ref={host} />;
}
