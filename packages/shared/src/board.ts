import { Chess } from 'chess.js';
import { JANGGI_INITIAL, janggiApply, janggiTargets } from './janggi.js';

export type MoveResult = { board: string; result: '' | 'win' | 'draw'; move: string };
export type BoardRules = {
  initial: string;
  /** 수를 두고 다음 판을 돌려준다. 불법이면 null. */
  apply: (board: string, move: unknown, seat: string) => MoveResult | null;
  /** 그 칸의 기물이 갈 수 있는 칸들. UI 표시용이며 판정은 apply 가 한다. */
  targets: (board: string, from: number, seat: string) => number[];
};

const OMOK_SIZE = 15;
const DIRECTIONS = [[1, 0], [0, 1], [1, 1], [1, -1]];

export function omokWins(board: string, index: number, seat: string): boolean {
  const x = index % OMOK_SIZE, y = Math.floor(index / OMOK_SIZE);
  return DIRECTIONS.some(([dx, dy]) => {
    let count = 1;
    for (const sign of [1, -1])
      for (let step = 1; step < 5; step++) {
        const nx = x + dx * step * sign, ny = y + dy * step * sign;
        if (nx < 0 || nx >= OMOK_SIZE || ny < 0 || ny >= OMOK_SIZE || board[ny * OMOK_SIZE + nx] !== seat) break;
        count++;
      }
    return count >= 5;
  });
}

// ponytail: 렌주룰(흑 삼삼/사사/장목 금수) 없음. 대회 규칙이 필요해지면 omokWins 옆에 금수 판정을 붙인다.
const omok: BoardRules = {
  initial: '.'.repeat(OMOK_SIZE * OMOK_SIZE),
  apply(board, move, seat) {
    if (typeof move !== 'number' || !Number.isInteger(move) || move < 0 || move >= board.length || board[move] !== '.') return null;
    const next = `${board.slice(0, move)}${seat}${board.slice(move + 1)}`;
    return { board: next, result: omokWins(next, move, seat) ? 'win' : next.includes('.') ? '' : 'draw', move: String(move) };
  },
  targets: () => [], // 빈 칸이면 어디든 둘 수 있어 표시할 게 없다.
};

const FILES = 'abcdefgh';
const square = (index: number) => `${FILES[index % 8]}${8 - Math.floor(index / 8)}`;
const squareIndex = (name: string) => (8 - Number(name[1])) * 8 + FILES.indexOf(name[0]);
const asMove = (move: unknown) => {
  if (typeof move !== 'object' || move === null) return null;
  const { from, to, promotion } = move as { from?: unknown; to?: unknown; promotion?: unknown };
  if (!Number.isInteger(from) || !Number.isInteger(to)) return null;
  return { from: from as number, to: to as number, promotion: typeof promotion === 'string' ? promotion : 'q' };
};

const chess: BoardRules = {
  initial: new Chess().fen(),
  apply(board, move, seat) {
    const parsed = asMove(move);
    if (!parsed || parsed.from < 0 || parsed.from > 63 || parsed.to < 0 || parsed.to > 63) return null;
    let game: Chess;
    try { game = new Chess(board); } catch { return null; }
    if (game.turn() !== seat) return null;
    // ponytail: 승격은 항상 퀸. 언더프로모션이 필요하면 클라이언트에서 promotion 을 실어 보낸다.
    try { game.move({ from: square(parsed.from), to: square(parsed.to), promotion: parsed.promotion }); } catch { return null; }
    return { board: game.fen(), result: game.isCheckmate() ? 'win' : game.isGameOver() ? 'draw' : '', move: `${square(parsed.from)}${square(parsed.to)}` };
  },
  targets(board, from, seat) {
    if (!Number.isInteger(from) || from < 0 || from > 63) return [];
    let game: Chess;
    try { game = new Chess(board); } catch { return []; }
    if (game.turn() !== seat) return [];
    return game.moves({ square: square(from) as never, verbose: true }).map(candidate => squareIndex(candidate.to));
  },
};

const janggi: BoardRules = {
  initial: JANGGI_INITIAL,
  apply(board, move, seat) {
    const parsed = asMove(move);
    return parsed ? janggiApply(board, parsed.from, parsed.to, seat) : null;
  },
  targets: janggiTargets,
};

export const BOARD_RULES = { omok, chess, janggi };
