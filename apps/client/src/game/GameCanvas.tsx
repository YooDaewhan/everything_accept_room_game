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
    if (this.input.keyboard) {
      this.keys = this.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT') as Record<string, Phaser.Input.Keyboard.Key>;
      this.input.keyboard.addCapture(['UP', 'DOWN', 'LEFT', 'RIGHT']);
    }
    if (!this.room) this.add.text(GAME.width / 2, GAME.height / 2, 'WSE SURVIVORS · TEST ARENA', { fontFamily: 'Arial', fontSize: '20px', color: '#a8c7d8' }).setOrigin(.5);
    this.events.once('shutdown', () => this.rendered.clear());
  }

  update(time: number): void {
    const g = this.graphics;
    const width = this.scale.width;
    const height = this.scale.height;
    const zoom = Math.min(width / GAME.width, height / GAME.height);
    const offsetX = (width - GAME.width * zoom) / 2;
    const offsetY = (height - GAME.height * zoom) / 2;
    const point = (entity: EntityView) => ({ x: offsetX + entity.x * zoom, y: offsetY + entity.y * zoom });
    const state = this.room?.state as GameView | undefined;
    const map = MAPS[state?.map as MapId] ?? MAPS.ruins;

    g.clear();
    g.fillStyle(map.background); g.fillRect(0, 0, width, height);
    const gridSize = 48 * zoom;
    g.lineStyle(1, map.grid, 0.72);
    for (let x = (offsetX % gridSize + gridSize) % gridSize; x < width; x += gridSize) g.lineBetween(x, 0, x, height);
    for (let y = (offsetY % gridSize + gridSize) % gridSize; y < height; y += gridSize) g.lineBetween(0, y, width, y);
    g.lineStyle(2, map.grid, 0.7);
    g.strokeRect(offsetX, offsetY, GAME.width * zoom, GAME.height * zoom);
    if (!this.room || !state?.players) return;

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
      const p = point(this.smooth(`g${id}`, gem, alive));
      g.fillStyle(0x72ffe5); g.fillTriangle(p.x, p.y - 8 * zoom, p.x + 6 * zoom, p.y, p.x, p.y + 8 * zoom); g.fillTriangle(p.x, p.y - 8 * zoom, p.x - 6 * zoom, p.y, p.x, p.y + 8 * zoom);
    }
    for (const [id, bullet] of state.projectiles) {
      const p = point(this.smooth(`b${id}`, bullet, alive));
      g.fillStyle(0xffd184); g.fillCircle(p.x, p.y, GAME.projectileRadius * zoom);
    }
    for (const [id, monster] of state.monsters) {
      const p = point(this.smooth(`m${id}`, monster, alive));
      g.fillStyle(0xf07261); g.fillCircle(p.x, p.y, GAME.monsterRadius * zoom);
      g.lineStyle(2, 0xffb095); g.strokeCircle(p.x, p.y, GAME.monsterRadius * zoom);
      g.fillStyle(0x24333b); g.fillRect(p.x - 17 * zoom, p.y - 27 * zoom, 34 * zoom, 4 * zoom);
      g.fillStyle(0xff9b8c); g.fillRect(p.x - 17 * zoom, p.y - 27 * zoom, 34 * zoom * monster.hp / monster.maxHp, 4 * zoom);
    }
    for (const [id, player] of state.players) {
      const p = point(this.smooth(`p${id}`, player, alive));
      const radius = GAME.playerRadius * zoom;
      const color = player.alive ? (CHARACTERS[player.character as CharacterId] ?? CHARACTERS.guardian).color : 0x5b6775;
      if (id === this.room.sessionId) { g.lineStyle(1, color, 0.2); g.strokeCircle(p.x, p.y, radius * 2.3); }
      g.fillStyle(color); g.fillCircle(p.x, p.y, radius);
      g.lineStyle(id === this.room.sessionId ? 3 : 2, 0xeaffff, .9); g.strokeCircle(p.x, p.y, radius + 2);
      g.fillStyle(0x24333b); g.fillRect(p.x - 22 * zoom, p.y - 29 * zoom, 44 * zoom, 5 * zoom);
      g.fillStyle(0x75e1ca); g.fillRect(p.x - 22 * zoom, p.y - 29 * zoom, 44 * zoom * player.hp / player.maxHp, 5 * zoom);
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

export function GameCanvas({ room, fullscreen = false }: { room: Room | null; fullscreen?: boolean }): React.JSX.Element {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!host.current) return;
    const game = new Phaser.Game({ type: Phaser.AUTO, parent: host.current,
      scale: { mode: fullscreen ? Phaser.Scale.RESIZE : Phaser.Scale.NONE, width: fullscreen ? window.innerWidth : GAME.width, height: fullscreen ? window.innerHeight : GAME.height },
      backgroundColor: '#101a28', scene: new ArenaScene(room) });
    const stop = () => { if (room) room.send(MSG.INPUT, { x: 0, y: 0 }); };
    window.addEventListener('blur', stop);
    return () => { window.removeEventListener('blur', stop); game.destroy(true); };
  }, [room, fullscreen]);
  return <div className={`game-canvas ${fullscreen ? 'game-canvas-full' : ''}`} ref={host} />;
}
