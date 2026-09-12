import type { RoleId, WeaponId } from './index.js';

export type WeaponBranch = 'F' | 'T';
export const WEAPON_BRANCHES: Record<WeaponId, { F: string; T: string }> = {
  orbit: { F: '공전 속도 75% 증가', T: '크기 50% · 피해 40% 증가' },
  basic: { F: '발사 주기 25% 감소', T: '기본 공격 피해 40% 증가' },
  trail: { F: '궤적 폭 증가 · 지속 시간 50% 증가', T: '궤적 피해 40% 증가' },
  pet: { F: '한 번에 3발 발사', T: '명중 시 반경 42 폭발' },
  meteor: { F: '낙하 수 +2', T: '화염 지역 지속 시간 3배' },
  slowfield: { F: '범위 안 적 공격력 15% 감소 · 받는 피해 15% 증가', T: '범위 안 적에게 주기적 피해' },
  bounce: { F: '도탄 횟수 +2', T: '명중 시 반경 42 폭발' },
  cannon: { F: '발사 탄환 수 +2', T: '8방향 발사' },
};

export const WEAPON_RULES: Record<WeaponId, { cooldown: number; damage: number; speed: number; radius: number; life: number }> = {
  orbit: { cooldown: 350, damage: 5, speed: 0, radius: 10, life: 0 },
  basic: { cooldown: 800, damage: 10, speed: 460, radius: 5, life: 1200 },
  trail: { cooldown: 250, damage: 4, speed: 0, radius: 18, life: 1800 },
  pet: { cooldown: 850, damage: 7, speed: 420, radius: 5, life: 1100 },
  meteor: { cooldown: 1800, damage: 18, speed: 0, radius: 40, life: 1400 },
  slowfield: { cooldown: 450, damage: 3, speed: 0, radius: 130, life: 0 },
  bounce: { cooldown: 1100, damage: 9, speed: 420, radius: 6, life: 1300 },
  cannon: { cooldown: 1600, damage: 25, speed: 260, radius: 12, life: 1800 },
};

export function weaponDamage(weapon: WeaponId, level: number, characterDamage: number, role: RoleId, forceLevel: number, branch?: string): number {
  const rule = WEAPON_RULES[weapon];
  return Math.max(1, Math.round((rule.damage + characterDamage - 10) * (1 + 0.2 * (level - 1)) * (1 + 0.15 * forceLevel) * (role === 'assault' ? 1.1 : role === 'support' ? 0.7 : 1) * (branch === 'T' && (weapon === 'orbit' || weapon === 'basic' || weapon === 'trail') ? 1.4 : 1)));
}

export function weaponCooldown(weapon: WeaponId, role: RoleId, cadenceLevel: number, branch?: string): number {
  const roleRate = role === 'support' && weapon !== 'basic' ? 0.9 : role === 'assault' ? 0.95 : 1;
  return Math.max(150, WEAPON_RULES[weapon].cooldown * Math.pow(0.88, cadenceLevel) * roleRate * (weapon === 'basic' && branch === 'F' ? 0.75 : 1));
}

export function weaponLevelDetail(weapon: WeaponId, level: number, branch?: string): string {
  const rule = WEAPON_RULES[weapon];
  switch (weapon) {
    case 'orbit': return `공전구 ${Math.min(11, level + 1)}개 · 크기 ${Math.round(rule.radius * (branch === 'T' ? 1.5 : 1))}`;
    case 'basic': return '마우스 방향 1회 공격';
    case 'trail': return `폭 ${Math.round(rule.radius + level * (branch === 'F' ? 5 : 2))} · ${((rule.life * (branch === 'F' ? 1.5 : 1)) / 1000).toFixed(1)}초`;
    case 'pet': return `한 번에 ${branch === 'F' ? 3 : 1}발${branch === 'T' ? ' · 폭발' : ''}`;
    case 'meteor': return `${1 + Math.floor(level / 3) + (branch === 'F' ? 2 : 0)}개 · ${((rule.life * (branch === 'T' ? 3 : 1)) / 1000).toFixed(1)}초`;
    case 'slowfield': return `반경 ${rule.radius + level * 10}${branch === 'F' ? ' · 약화' : branch === 'T' ? ' · 피해' : ''}`;
    case 'bounce': return `도탄 ${1 + (branch === 'F' ? 2 : 0)}회${branch === 'T' ? ' · 폭발' : ''}`;
    case 'cannon': return `${branch === 'T' ? 8 : 1 + Math.floor(level / 4) + (branch === 'F' ? 2 : 0)}발${branch === 'T' ? ' · 전방위' : ''}`;
  }
}
