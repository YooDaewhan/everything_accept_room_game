// 장기 규칙. 대문자는 초(아래, 선수), 소문자는 한(위).
// K 궁 · A 사 · E 상 · H 마 · R 차 · C 포 · P 졸/병
export const JANGGI_COLS = 9;
export const JANGGI_ROWS = 10;
const W = JANGGI_COLS;
export const JANGGI_INITIAL = [
  'rhea.aehr',
  '....k....',
  '.c.....c.',
  'p.p.p.p.p',
  '.........',
  '.........',
  'P.P.P.P.P',
  '.C.....C.',
  '....K....',
  'RHEA.AEHR',
].join('');

const ORTHOGONAL = [[1, 0], [-1, 0], [0, 1], [0, -1]] as const;
const side = (piece: string) => piece >= 'A' && piece <= 'Z' ? 'c' : 'h';
const inBoard = (x: number, y: number) => x >= 0 && x < W && y >= 0 && y < JANGGI_ROWS;
const inAnyPalace = (index: number) => index % W >= 3 && index % W <= 5 && (index < W * 3 || index >= W * 7);
const inOwnPalace = (x: number, y: number, seat: string) => inBoard(x, y) && x >= 3 && x <= 5 && (seat === 'c' ? y >= 7 : y <= 2);

// 궁성의 대각선. 중앙은 네 귀퉁이와, 귀퉁이는 중앙과만 이어진다.
const DIAGONALS = new Map<number, number[]>();
for (const top of [0, 7]) {
  const center = (top + 1) * W + 4;
  for (const corner of [top * W + 3, top * W + 5, (top + 2) * W + 3, (top + 2) * W + 5]) {
    DIAGONALS.set(center, [...DIAGONALS.get(center) ?? [], corner]);
    DIAGONALS.set(corner, [center]);
  }
}
const isPalaceCenter = (index: number) => DIAGONALS.get(index)?.length === 4;

/** 장군 여부를 따지지 않은 기물 본래의 이동. */
function reach(board: string, from: number): number[] {
  const piece = board[from];
  if (piece === '.') return [];
  const mine = side(piece);
  const x = from % W, y = Math.floor(from / W);
  const moves: number[] = [];
  const add = (index: number) => { if (board[index] === '.' || side(board[index]) !== mine) moves.push(index); };
  // 마·상은 다리를 하나씩 건너며, 각 다리가 비어 있어야 한다.
  const legs = (dx: number, dy: number) => dx !== 0 ? [[dx, 1], [dx, -1]] : [[1, dy], [-1, dy]];

  switch (piece.toLowerCase()) {
    case 'k': case 'a':
      for (const [dx, dy] of ORTHOGONAL) if (inOwnPalace(x + dx, y + dy, mine)) add((y + dy) * W + x + dx);
      for (const target of DIAGONALS.get(from) ?? []) if (inOwnPalace(target % W, Math.floor(target / W), mine)) add(target);
      break;
    case 'r':
      for (const [dx, dy] of ORTHOGONAL)
        for (let nx = x + dx, ny = y + dy; inBoard(nx, ny); nx += dx, ny += dy) {
          const index = ny * W + nx;
          add(index);
          if (board[index] !== '.') break;
        }
      for (const step of DIAGONALS.get(from) ?? []) {
        add(step);
        // 귀퉁이에서 빈 중앙을 지나 맞은편 귀퉁이까지.
        if (board[step] === '.' && isPalaceCenter(step) && inAnyPalace(2 * step - from)) add(2 * step - from);
      }
      break;
    case 'c':
      for (const [dx, dy] of ORTHOGONAL) {
        let jumped = false;
        for (let nx = x + dx, ny = y + dy; inBoard(nx, ny); nx += dx, ny += dy) {
          const index = ny * W + nx, target = board[index];
          if (!jumped) {
            if (target === '.') continue;
            if (target.toLowerCase() === 'c') break; // 포는 포를 넘지 못한다.
            jumped = true; continue;
          }
          if (target === '.') { moves.push(index); continue; }
          if (target.toLowerCase() !== 'c' && side(target) !== mine) moves.push(index); // 포는 포를 잡지 못한다.
          break;
        }
      }
      for (const step of DIAGONALS.get(from) ?? []) {
        if (!isPalaceCenter(step) || board[step] === '.' || board[step].toLowerCase() === 'c') continue;
        const far = 2 * step - from;
        if (!inAnyPalace(far)) continue;
        if (board[far] === '.' || (board[far].toLowerCase() !== 'c' && side(board[far]) !== mine)) moves.push(far);
      }
      break;
    case 'h': case 'e': {
      const reps = piece.toLowerCase() === 'h' ? 1 : 2;
      for (const [dx, dy] of ORTHOGONAL) {
        if (!inBoard(x + dx, y + dy) || board[(y + dy) * W + x + dx] !== '.') continue;
        for (const [ex, ey] of legs(dx, dy)) {
          let nx = x + dx, ny = y + dy, blocked = false;
          for (let step = 0; step < reps; step++) {
            nx += ex; ny += ey;
            if (!inBoard(nx, ny) || (step < reps - 1 && board[ny * W + nx] !== '.')) { blocked = true; break; }
          }
          if (!blocked) add(ny * W + nx);
        }
      }
      break;
    }
    case 'p': {
      const forward = mine === 'c' ? -1 : 1;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, forward]]) if (inBoard(x + dx, y + dy)) add((y + dy) * W + x + dx);
      for (const target of DIAGONALS.get(from) ?? []) if (Math.floor(target / W) - y === forward) add(target);
      break;
    }
  }
  return moves;
}

const move = (board: string, from: number, to: number) => {
  const moved = `${board.slice(0, to)}${board[from]}${board.slice(to + 1)}`;
  return `${moved.slice(0, from)}.${moved.slice(from + 1)}`;
};
const generalOf = (board: string, seat: string) => board.indexOf(seat === 'c' ? 'K' : 'k');

// ponytail: 매 수마다 판 전체를 훑는다. 90칸이라 무시할 만하다.
function inCheck(board: string, seat: string): boolean {
  const general = generalOf(board, seat);
  if (general < 0) return true;
  for (let index = 0; index < board.length; index++)
    if (board[index] !== '.' && side(board[index]) !== seat && reach(board, index).includes(general)) return true;
  return false;
}

/** 빅장: 두 궁이 같은 줄에서 사이에 기물 없이 마주 본 상태. */
export function bikjang(board: string): boolean {
  const cho = generalOf(board, 'c'), han = generalOf(board, 'h');
  if (cho < 0 || han < 0 || cho % W !== han % W) return false;
  for (let index = Math.min(cho, han) + W; index < Math.max(cho, han); index += W) if (board[index] !== '.') return false;
  return true;
}

export function janggiTargets(board: string, from: number, seat: string): number[] {
  if (!Number.isInteger(from) || from < 0 || from >= board.length || board[from] === '.' || side(board[from]) !== seat) return [];
  return reach(board, from).filter(to => !inCheck(move(board, from, to), seat));
}

function hasMove(board: string, seat: string): boolean {
  for (let index = 0; index < board.length; index++)
    if (board[index] !== '.' && side(board[index]) === seat && janggiTargets(board, index, seat).length > 0) return true;
  return false;
}

export function janggiApply(board: string, from: unknown, to: unknown, seat: string): { board: string; result: '' | 'win' | 'draw'; move: string } | null {
  if (!Number.isInteger(from) || !Number.isInteger(to) || !janggiTargets(board, from as number, seat).includes(to as number)) return null;
  const next = move(board, from as number, to as number);
  const enemy = seat === 'c' ? 'h' : 'c';
  const label = `${from}-${to}`;
  if (bikjang(next)) return { board: next, result: 'draw', move: label };
  // ponytail: 한 수 쉬기(pass)와 점수제 판정 없음. 움직일 수 없는데 장군도 아니면 무승부로 끝낸다.
  if (!hasMove(next, enemy)) return { board: next, result: inCheck(next, enemy) ? 'win' : 'draw', move: label };
  return { board: next, result: '', move: label };
}
