import type { BoardGameId } from '@wse/shared';

export type FieldSkin = { id: string; name: string; description: string; light: string; dark: string; border: string };
export type PieceSkin = { id: string; name: string; description: string; preview: string };

// 새 테마는 게임별 판 또는 기물 목록에 독립적으로 추가합니다.
export const FIELD_SKINS: Record<BoardGameId, FieldSkin[]> = {
  omok: [
    { id: 'classic', name: '나무판', description: '기본 오목판', light: '#c8a166', dark: '#c8a166', border: '#8d6a3d' },
    { id: 'night', name: '밤의 판', description: '깊은 청록색 판', light: '#315363', dark: '#315363', border: '#8bc4c4' },
  ],
  chess: [
    { id: 'classic', name: '클래식', description: '밝은 나무판', light: '#e9d8b6', dark: '#7d9b68', border: '#3c5968' },
    { id: 'night', name: '밤의 판', description: '짙은 남색과 청록색', light: '#627989', dark: '#263f50', border: '#78a6b1' },
  ],
  janggi: [
    { id: 'classic', name: '나무판', description: '기본 장기판', light: '#d9b382', dark: '#d9b382', border: '#8d6a3d' },
    { id: 'night', name: '밤의 판', description: '짙은 남색 장기판', light: '#365766', dark: '#365766', border: '#78a6b1' },
  ],
};

export const PIECE_SKINS: Record<BoardGameId, PieceSkin[]> = {
  omok: [
    { id: 'classic', name: '기본 돌', description: '윤기 있는 흑백 돌', preview: '●' },
    { id: 'glow', name: '빛나는 돌', description: '은은하게 빛나는 돌', preview: '◉' },
  ],
  chess: [
    { id: 'classic', name: '기본 기물', description: '전통 체스 기호', preview: '♞' },
    { id: 'glow', name: '빛나는 기물', description: '빛나는 테두리', preview: '♛' },
  ],
  janggi: [
    { id: 'classic', name: '기본 기물', description: '전통 장기 알', preview: '楚' },
    { id: 'glow', name: '빛나는 기물', description: '빛나는 장기 알', preview: '漢' },
  ],
};
