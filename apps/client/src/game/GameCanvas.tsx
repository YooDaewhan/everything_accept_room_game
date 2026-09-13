import { useEffect, useRef } from 'react';
import type { Room } from '@colyseus/sdk';
import Phaser from 'phaser';
import { CHARACTERS, GAME, MAPS, MONSTER_KINDS, MSG, type CharacterId, type MapId, type MonsterKind, type GameView, type EntityView } from '@wse/shared';

const projectileColor: Record<string, number> = { basic: 0xffd184, orbit: 0xe6d578, trail: 0xff8869, pet: 0x74c7f5, meteor: 0xff8869, bounce: 0xe6d578, cannon: 0xffa768, monster: 0xff6371 };

class ArenaScene extends Phaser.Scene {
  private graphics!: Phaser.GameObjects.Graphics;
  private keys?: Record<string, Phaser.Input.Keyboard.Key>;
  private lastSent = 0;
  private rendered = new Map<string, EntityView>();
  private localCamera?: { x: number; y: number; fromX: number; fromY: number; toX: number; toY: number; startedAt: number };

  constructor(private room: Room | null) { super('arena'); }

  create(): void {
    this.graphics = this.add.graphics();
    if (this.input.keyboard) {
      this.keys = this.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT') as Record<string, Phaser.Input.Keyboard.Key>;
      this.input.keyboard.addCapture(['UP', 'DOWN', 'LEFT', 'RIGHT']);
    }
    if (!this.room) this.add.text(GAME.viewWidth / 2, GAME.viewHeight / 2, 'WSE SURVIVORS · TEST ARENA', { fontFamily: 'Arial', fontSize: '20px', color: '#a8c7d8' }).setOrigin(.5);
    this.events.once('shutdown', () => this.rendered.clear());
  }

  update(time: number): void {
    const g = this.graphics;
    const width = this.scale.width;
    const height = this.scale.height;
    const zoom = Math.min(width / GAME.viewWidth, height / GAME.viewHeight) * 0.5;
    const state = this.room?.state as GameView | undefined;
    const map = MAPS[state?.map as MapId] ?? MAPS.ruins;
    const me = state?.players?.get(this.room?.sessionId ?? '');
    const camera = me ? this.interpolateCamera(me, time) : { x: GAME.width / 2, y: GAME.height / 2 };
    const cameraX = camera.x;
    const cameraY = camera.y;
    const offsetX = width / 2 - cameraX * zoom;
    const offsetY = height / 2 - cameraY * zoom;
    const point = (entity: EntityView) => ({ x: offsetX + entity.x * zoom, y: offsetY + entity.y * zoom });

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
      const pointer = this.input.activePointer;
      const aimX = pointer.x - (offsetX + cameraX * zoom);
      const aimY = pointer.y - (offsetY + cameraY * zoom);
      const aimLength = Math.hypot(aimX, aimY);
      const aimed = (pointer.x !== 0 || pointer.y !== 0) && aimLength > 8;
      this.room.send(MSG.INPUT, { x, y, aimX: aimed ? aimX / aimLength : 1, aimY: aimed ? aimY / aimLength : 0 });
    }

    const alive = new Set<string>();
    for (const [id, gem] of state.gems) {
      const p = point(this.smooth(`g${id}`, gem, alive));
      g.fillStyle(0x72ffe5); g.fillTriangle(p.x, p.y - 8 * zoom, p.x + 6 * zoom, p.y, p.x, p.y + 8 * zoom); g.fillTriangle(p.x, p.y - 8 * zoom, p.x - 6 * zoom, p.y, p.x, p.y + 8 * zoom);
    }
    for (const [id, bullet] of state.projectiles) {
      const p = point(this.smooth(`b${id}`, bullet, alive));
      g.fillStyle(projectileColor[bullet.weapon] ?? 0xffd184); g.fillCircle(p.x, p.y, (bullet.weapon === 'meteor' ? 35 : bullet.weapon === 'cannon' ? 12 : bullet.weapon === 'trail' ? 18 : GAME.projectileRadius) * zoom);
    }
    for (const [id, monster] of state.monsters) {
      const p = point(this.smooth(`m${id}`, monster, alive));
      const kind = MONSTER_KINDS[monster.kind as MonsterKind] ?? MONSTER_KINDS.grunt;
      const radius = kind.radius * zoom;
      g.fillStyle(kind.color);
      if (monster.kind === 'ranger') g.fillTriangle(p.x, p.y - radius, p.x + radius, p.y + radius, p.x - radius, p.y + radius);
      else g.fillCircle(p.x, p.y, radius);
      g.lineStyle(2, 0xffc0a7); g.strokeCircle(p.x, p.y, radius);
      if (monster.kind === 'charger') { g.lineStyle(2, 0x4a2038); g.strokeCircle(p.x, p.y, radius * .55); }
      g.fillStyle(0x24333b); g.fillRect(p.x - 17 * zoom, p.y - 27 * zoom, 34 * zoom, 4 * zoom);
      g.fillStyle(0xff9b8c); g.fillRect(p.x - 17 * zoom, p.y - 27 * zoom, 34 * zoom * monster.hp / monster.maxHp, 4 * zoom);
    }
    for (const [id, player] of state.players) {
      const visual = id === this.room.sessionId ? camera : this.smooth(`p${id}`, player, alive);
      if (id === this.room.sessionId) alive.add(`p${id}`);
      const p = point(visual);
      const radius = GAME.playerRadius * zoom;
      const color = player.alive ? (CHARACTERS[player.character as CharacterId] ?? CHARACTERS.guardian).color : 0x5b6775;
      const attackAge = state.elapsedMs - player.meleeAttackAt;
      if (player.alive && player.meleeAttackAt > 0 && attackAge >= 0 && attackAge < 200) {
        const reach = 75 * zoom;
        const halfAngle = Math.acos(0.35);
        const start = player.meleeAttackAngle - halfAngle;
        const end = player.meleeAttackAngle + halfAngle;
        g.fillStyle(0xffd184, 0.22 * (1 - attackAge / 200));
        for (let i = 0; i < 16; i++) {
          const a = start + (end - start) * i / 16;
          const b = start + (end - start) * (i + 1) / 16;
          g.fillTriangle(p.x, p.y, p.x + Math.cos(a) * reach, p.y + Math.sin(a) * reach, p.x + Math.cos(b) * reach, p.y + Math.sin(b) * reach);
        }
        g.lineStyle(2, 0xffd184, 0.75 * (1 - attackAge / 200));
        g.beginPath(); g.moveTo(p.x, p.y);
        for (let i = 0; i <= 16; i++) g.lineTo(p.x + Math.cos(start + (end - start) * i / 16) * reach, p.y + Math.sin(start + (end - start) * i / 16) * reach);
        g.closePath(); g.strokePath();
      }
      if (id === this.room.sessionId) { g.lineStyle(1, color, 0.2); g.strokeCircle(p.x, p.y, radius * 2.3); }
      const fieldLevel = player.upgrades.get('slowfield') ?? 0;
      if (fieldLevel > 0) { g.fillStyle(0x74c7f5, .05); g.fillCircle(p.x, p.y, (130 + fieldLevel * 10) * zoom); g.lineStyle(1, 0x74c7f5, .26); g.strokeCircle(p.x, p.y, (130 + fieldLevel * 10) * zoom); }
      if ((player.upgrades.get('pet') ?? 0) > 0) { g.fillStyle(0x84d5ee); g.fillCircle(p.x + 36 * zoom, p.y - 30 * zoom, 9 * zoom); g.lineStyle(2, 0xe7fbff); g.strokeCircle(p.x + 36 * zoom, p.y - 30 * zoom, 9 * zoom); }
      const invulnerable = player.invulnerableUntil > (state?.elapsedMs ?? 0) || player.pendingUpgrade || Boolean(player.pendingEvolution);
      g.fillStyle(color, invulnerable ? .5 : 1); g.fillCircle(p.x, p.y, radius);
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

  private interpolateCamera(target: EntityView, time: number): EntityView {
    if (!this.localCamera) this.localCamera = { x: target.x, y: target.y, fromX: target.x, fromY: target.y, toX: target.x, toY: target.y, startedAt: time };
    const camera = this.localCamera;
    const progress = Math.max(0, Math.min(1, (time - camera.startedAt) / GAME.patchMs));
    camera.x = camera.fromX + (camera.toX - camera.fromX) * progress;
    camera.y = camera.fromY + (camera.toY - camera.fromY) * progress;
    if (target.x !== camera.toX || target.y !== camera.toY) {
      camera.fromX = camera.x; camera.fromY = camera.y;
      camera.toX = target.x; camera.toY = target.y;
      camera.startedAt = time;
    }
    return camera;
  }
}

export function GameCanvas({ room, fullscreen = false }: { room: Room | null; fullscreen?: boolean }): React.JSX.Element {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!host.current) return;
    const game = new Phaser.Game({ type: Phaser.AUTO, parent: host.current,
      scale: { mode: fullscreen ? Phaser.Scale.RESIZE : Phaser.Scale.NONE, width: fullscreen ? window.innerWidth : GAME.viewWidth, height: fullscreen ? window.innerHeight : GAME.viewHeight },
      backgroundColor: '#101a28', scene: new ArenaScene(room) });
    const stop = () => { if (room) room.send(MSG.INPUT, { x: 0, y: 0 }); };
    window.addEventListener('blur', stop);
    return () => { window.removeEventListener('blur', stop); game.destroy(true); };
  }, [room, fullscreen]);
  return <div className={`game-canvas ${fullscreen ? 'game-canvas-full' : ''}`} ref={host} />;
}
