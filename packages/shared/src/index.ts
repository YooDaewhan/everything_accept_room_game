export const ROOM_NAME = 'survivors';
export const MAX_PLAYERS = 2;
export const NICKNAME_PATTERN = /^[\p{L}\p{N}_ -]{2,16}$/u;
export const MSG = { INPUT: 'input', START: 'start', CHARACTER: 'character', ROLE: 'role', UPGRADE: 'upgrade', EVOLUTION: 'evolution' } as const;
export const ROLES = {
  assault: { name: '공격', description: '공격력 +10% · 공격 속도 +5%' },
  defense: { name: '방어', description: '받는 피해 -15% · 체력 +10%' },
  support: { name: '지원', description: '재사용 대기 -10% · 아군 회복 · 적 피해 -30%' },
  luck: { name: '덤', description: '경험치 +10% · 아이템 드롭률 +10%' },
} as const;
export type RoleId = keyof typeof ROLES;
export const CHARACTERS = {
  guardian: { name: '수호자', description: '높은 체력의 근접 캐릭터.', style: 'melee', color: 0x65dbeb, hp: 140, speed: 150, damage: 15 },
  ranger: { name: '추적자', description: '빠르게 움직이는 원거리 캐릭터.', style: 'ranged', color: 0x95e5a9, hp: 90, speed: 220, damage: 10 },
  arcanist: { name: '비전술사', description: '강한 탄환을 쓰는 원거리 캐릭터.', style: 'ranged', color: 0xb191ff, hp: 80, speed: 180, damage: 13 },
} as const;
export type CharacterId = keyof typeof CHARACTERS;
export type AttackStyle = typeof CHARACTERS[CharacterId]['style'];
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
export const MONSTER_KINDS = {
  grunt: { name: '근접형', color: 0xf07261, radius: 16 },
  ranger: { name: '원거리형', color: 0xffb36a, radius: 14 },
  charger: { name: '돌진형', color: 0xb65d7a, radius: 21 },
} as const;
export type MonsterKind = keyof typeof MONSTER_KINDS;
export const ELEMENTS = {
  fire: { name: '불', color: 0xff8565, description: '화상으로 지속 피해' },
  water: { name: '물', color: 0x74c7f5, description: '동상으로 이동 속도 감소' },
  lightning: { name: '번개', color: 0xe6d578, description: '마비로 잠시 정지' },
} as const;
export type ElementId = keyof typeof ELEMENTS;
export const UPGRADES = {
  orbit: { kind: 'weapon', name: '공전구', description: '주위를 도는 투사체가 늘어납니다.', symbol: '◌' },
  basic: { kind: 'weapon', name: '기본 공격', description: '마우스 방향의 기본 공격을 강화합니다.', symbol: '✦' },
  trail: { kind: 'weapon', name: '이동 궤적', description: '지나간 자리에 피해 지역을 남깁니다.', symbol: '〰' },
  pet: { kind: 'weapon', name: '자동 공격 장치', description: '펫이 가까운 적에게 자동 발사합니다.', symbol: '◇' },
  meteor: { kind: 'weapon', name: '메테오', description: '주변 무작위 위치에 낙하 공격합니다.', symbol: '☄' },
  slowfield: { kind: 'weapon', name: '둔화 영역', description: '주변 적의 이동을 늦춥니다.', symbol: '◎' },
  bounce: { kind: 'weapon', name: '도탄', description: '적을 맞힌 뒤 다른 적에게 튕깁니다.', symbol: '↝' },
  cannon: { kind: 'weapon', name: '대포', description: '느리고 강한 보조탄을 발사합니다.', symbol: '▣' },
  vitality: { kind: 'passive', name: '체력', description: '최대 체력과 현재 체력을 높입니다.', symbol: '♥' },
  haste: { kind: 'passive', name: '이동 속도', description: '더 빠르게 이동합니다.', symbol: '»' },
  cadence: { kind: 'passive', name: '공격 속도', description: '모든 무기의 발사 주기를 줄입니다.', symbol: '↯' },
  force: { kind: 'passive', name: '공격력', description: '모든 무기의 피해량을 높입니다.', symbol: '▲' },
  armor: { kind: 'passive', name: '방어력', description: '몬스터의 접촉 피해를 줄입니다.', symbol: '⬡' },
  magnet: { kind: 'special', name: '획득 범위', description: '경험치 보석을 더 멀리서 획득합니다.', symbol: '◉' },
  vision: { kind: 'special', name: '시야 범위', description: '볼 수 있는 전장 범위를 넓힙니다.', symbol: '◎' },
  fortune: { kind: 'special', name: '경험치 획득률', description: '얻는 경험치를 높입니다.', symbol: '✧' },
  speed: { kind: 'special', name: '이동 속도 추가', description: '이동 속도를 높입니다.', symbol: '➤' },
  ward: { kind: 'special', name: '보호막', description: '30초마다 3초간 무적이 됩니다.', symbol: '⬡' },
} as const;
export type UpgradeId = keyof typeof UPGRADES;
export type WeaponId = { [K in UpgradeId]: typeof UPGRADES[K]['kind'] extends 'weapon' ? K : never }[UpgradeId];
export { WEAPON_BRANCHES, WEAPON_RULES, weaponDamage, weaponCooldown, weaponLevelDetail } from './weapons.js';
export type { WeaponBranch } from './weapons.js';
export const GAME = { width: 2400, height: 1600, viewWidth: 960, viewHeight: 540, tickMs: 50, patchMs: 100, playerSpeed: 180, playerRadius: 15, playerHp: 100, invulnerableMs: 550, attackMs: 800, attackDamage: 10, projectileSpeed: 460, projectileRadius: 5, projectileLifeMs: 1200, monsterRadius: 16, monsterSpeed: 65, monsterHp: 30, monsterDamage: 10, monsterHitMs: 900, spawnMs: 1400, maxMonsters: 35, gemRadius: 10, gemXp: 5 } as const;
export type InputMessage = { x: number; y: number; aimX?: number; aimY?: number };
export type EntityView = { x: number; y: number };
export type PlayerView = EntityView & { nickname: string; character: CharacterId; role: RoleId; hp: number; maxHp: number; xp: number; xpToNext: number; level: number; pendingUpgrade: boolean; pendingEvolution: string; choice0: string; choice1: string; choice2: string; upgrades: Map<UpgradeId, number>; evolutions: Map<string, string>; invulnerableUntil: number; alive: boolean };
export type MonsterView = EntityView & { kind: MonsterKind; hp: number; maxHp: number };
export type ProjectileView = EntityView & { weapon: string; owner: string };
export type GemView = EntityView & { xp: number };
export type GameView = { code: string; phase: string; hostId: string; map: MapId; difficulty: DifficultyId; elapsedMs: number; kills: number; players: Map<string, PlayerView>; monsters: Map<string, MonsterView>; projectiles: Map<string, ProjectileView>; gems: Map<string, GemView> };
