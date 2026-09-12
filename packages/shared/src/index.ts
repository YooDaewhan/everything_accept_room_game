export const ROOM_NAME = 'survivors';
export const MAX_PLAYERS = 2;
export const NICKNAME_PATTERN = /^[\p{L}\p{N}_ -]{2,16}$/u;
export const MSG = { INPUT: 'input', START: 'start', CHARACTER: 'character', SETTINGS: 'settings' } as const;
export const CHARACTERS = {
  guardian: { name: '수호자', description: '체력이 높고 이동이 느립니다.', color: 0x65dbeb, hp: 140, speed: 150, damage: 10 },
  ranger: { name: '추적자', description: '빠르게 이동합니다.', color: 0x95e5a9, hp: 90, speed: 220, damage: 10 },
  arcanist: { name: '비전술사', description: '공격력이 높습니다.', color: 0xb191ff, hp: 80, speed: 180, damage: 15 },
} as const;
export type CharacterId = keyof typeof CHARACTERS;
export const MAPS = {
  ruins: { name: '폐허', description: '차가운 돌의 전장', background: 0x101a28, grid: 0x26394d },
  forest: { name: '숲', description: '어두운 녹음의 전장', background: 0x10231f, grid: 0x275044 },
  ember: { name: '잿불', description: '뜨거운 황혼의 전장', background: 0x2a1b1e, grid: 0x57363b },
} as const;
export type MapId = keyof typeof MAPS;
export const DIFFICULTIES = {
  easy: { name: '쉬움', description: '느린 몬스터 · 적은 피해', monsterSpeed: 0.8, monsterHp: 0.8, monsterDamage: 0.7, spawn: 1.3 },
  normal: { name: '보통', description: '기본 생존 규칙', monsterSpeed: 1, monsterHp: 1, monsterDamage: 1, spawn: 1 },
  hard: { name: '어려움', description: '빠른 몬스터 · 강한 피해', monsterSpeed: 1.25, monsterHp: 1.4, monsterDamage: 1.5, spawn: 0.7 },
} as const;
export type DifficultyId = keyof typeof DIFFICULTIES;
export const GAME = { width: 960, height: 540, tickMs: 50, patchMs: 100, playerSpeed: 180, playerRadius: 15, playerHp: 100, invulnerableMs: 550, attackMs: 800, attackDamage: 10, projectileSpeed: 460, projectileRadius: 5, projectileLifeMs: 1200, monsterRadius: 16, monsterSpeed: 65, monsterHp: 30, monsterDamage: 10, monsterHitMs: 900, spawnMs: 1400, maxMonsters: 35, gemRadius: 10, gemXp: 5 } as const;
export type InputMessage = { x: number; y: number };
export type EntityView = { x: number; y: number };
export type PlayerView = EntityView & { nickname: string; character: CharacterId; hp: number; maxHp: number; xp: number; alive: boolean };
export type MonsterView = EntityView & { hp: number; maxHp: number };
export type ProjectileView = EntityView;
export type GemView = EntityView;
export type GameView = { code: string; phase: string; hostId: string; map: MapId; difficulty: DifficultyId; players: Map<string, PlayerView>; monsters: Map<string, MonsterView>; projectiles: Map<string, ProjectileView>; gems: Map<string, GemView> };
