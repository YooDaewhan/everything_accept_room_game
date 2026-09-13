import test from 'node:test';
import assert from 'node:assert/strict';
import { BOARD_RULES, JANGGI_COLS as W, JANGGI_INITIAL } from '@wse/shared';

const { omok, chess, janggi } = BOARD_RULES;
const play = (board, moves, seat) => moves.reduce((current, index) => omok.apply(current, index, seat).board, board);

test('omok: 가로 5목이면 승리, 4목은 아니다', () => {
  const four = play(omok.initial, [30, 31, 32, 33], 'b');
  assert.equal(omok.apply(four, 34, 'w').result, '');
  assert.equal(omok.apply(four, 34, 'b').result, 'win');
});

test('omok: 대각선 5목과 6목도 승리로 잡힌다', () => {
  const diagonal = play(omok.initial, [0, 16, 32, 48], 'w');
  assert.equal(omok.apply(diagonal, 64, 'w').result, 'win');
  const overline = play(omok.initial, [16, 17, 18, 20, 21], 'b');
  assert.equal(omok.apply(overline, 19, 'b').result, 'win');
});

test('omok: 이미 놓인 자리와 판 밖은 거부한다', () => {
  const once = omok.apply(omok.initial, 5, 'b').board;
  assert.equal(omok.apply(once, 5, 'w'), null);
  assert.equal(omok.apply(once, 225, 'w'), null);
  assert.equal(omok.apply(once, -1, 'w'), null);
  assert.equal(omok.apply(once, '5', 'w'), null);
});

const at = (name) => (8 - Number(name[1])) * 8 + 'abcdefgh'.indexOf(name[0]);
test('chess: 불법 수와 상대 차례는 거부한다', () => {
  assert.equal(chess.apply(chess.initial, { from: at('e2'), to: at('e5') }, 'w'), null);
  assert.equal(chess.apply(chess.initial, { from: at('e7'), to: at('e5') }, 'b'), null);
  assert.equal(chess.apply(chess.initial, 3, 'w'), null);
});

test('chess: 바보 메이트로 승패가 난다', () => {
  const seats = ['w', 'b'];
  const end = [['f2', 'f3'], ['e7', 'e5'], ['g2', 'g4'], ['d8', 'h4']].reduce((state, [from, to], turn) => {
    const next = chess.apply(state.board, { from: at(from), to: at(to) }, seats[turn % 2]);
    assert.ok(next, `${from}${to} 가 거부되었다`);
    return next;
  }, { board: chess.initial });
  assert.equal(end.result, 'win');
});

test('chess: targets 는 그 기물의 합법수만 돌려준다', () => {
  assert.deepEqual(chess.targets(chess.initial, at('e2'), 'w').sort(), [at('e3'), at('e4')].sort());
  assert.deepEqual(chess.targets(chess.initial, at('b1'), 'w').sort(), [at('a3'), at('c3')].sort());
  assert.deepEqual(chess.targets(chess.initial, at('e7'), 'w'), []); // 상대 기물
});

// 장기: 빈 판에 기물을 놓고 본다. 궁이 없으면 장군 판정이 막히므로 양쪽 궁은 항상 둔다.
const empty = '.'.repeat(W * 10);
const put = (board, ...pairs) => pairs.reduce((current, [index, piece]) => `${current.slice(0, index)}${piece}${current.slice(index + 1)}`, board);
const rc = (row, col) => row * W + col;
const generals = (board) => put(board, [rc(8, 4), 'K'], [rc(1, 4), 'k']);
const sorted = (list) => [...list].sort((a, b) => a - b);

test('장기: 초기 배치에서 차·포·마·상이 규칙대로 움직인다', () => {
  // 차(9,0): 같은 줄 아군 졸에 막혀 두 칸만.
  assert.deepEqual(sorted(janggi.targets(JANGGI_INITIAL, rc(9, 0), 'c')), [rc(7, 0), rc(8, 0)]);
  // 포(7,1): 위로는 첫 기물이 상대 포라 못 넘고, 아래·옆은 넘을 기물이 없다.
  assert.deepEqual(janggi.targets(JANGGI_INITIAL, rc(7, 1), 'c'), []);
  // 마를 옆으로 내보내 다리를 만들면 포가 그 위로 넘어가고, 맞은편 포는 잡지 못한다.
  const opened = janggi.apply(JANGGI_INITIAL, { from: rc(9, 1), to: rc(7, 2) }, 'c').board;
  assert.deepEqual(sorted(janggi.targets(opened, rc(7, 1), 'c')), [rc(7, 3), rc(7, 4), rc(7, 5), rc(7, 6)]);
  // 마(9,1): 다리가 비어 있는 쪽으로만.
  assert.deepEqual(sorted(janggi.targets(JANGGI_INITIAL, rc(9, 1), 'c')), [rc(7, 0), rc(7, 2)]);
  // 상(9,2): 내릴 자리에 아군 졸이 있고 다른 쪽 다리는 포가 막아 첫 수엔 못 움직인다.
  assert.deepEqual(janggi.targets(JANGGI_INITIAL, rc(9, 2), 'c'), []);
  // 졸은 앞과 옆으로만 간다.
  assert.deepEqual(sorted(janggi.targets(JANGGI_INITIAL, rc(6, 0), 'c')), [rc(5, 0), rc(6, 1)]);
  // 한 차례에 초 기물은 못 움직인다.
  assert.deepEqual(janggi.targets(JANGGI_INITIAL, rc(9, 0), 'h'), []);
});

test('장기: 포는 포를 넘지도 잡지도 못한다', () => {
  const board = generals(put(empty, [rc(5, 0), 'C'], [rc(5, 2), 'c'], [rc(5, 4), 'r']));
  assert.equal(janggi.targets(board, rc(5, 0), 'c').includes(rc(5, 4)), false);
  const overPawn = generals(put(empty, [rc(5, 0), 'C'], [rc(5, 2), 'p'], [rc(5, 4), 'c'], [rc(5, 6), 'r']));
  // 졸을 넘어 빈 칸까지 가고, 그 앞의 포는 잡지 못한 채 멈춘다.
  assert.deepEqual(sorted(janggi.targets(overPawn, rc(5, 0), 'c')), [rc(5, 3)]);
});

test('장기: 궁과 사는 궁성을 벗어나지 못한다', () => {
  const board = put(empty, [rc(9, 4), 'K'], [rc(1, 4), 'k'], [rc(9, 3), 'A']);
  // 판 밖(10번째 줄)이나 궁성 밖으로는 한 칸도 못 나간다.
  assert.deepEqual(sorted(janggi.targets(board, rc(9, 3), 'c')), [rc(8, 3), rc(8, 4)]);
  assert.deepEqual(sorted(janggi.targets(board, rc(9, 4), 'c')), [rc(8, 4), rc(9, 5)]);
  assert.ok(janggi.targets(board, rc(9, 4), 'c').every(index => index >= 0 && index < W * 10));
});

test('장기: 졸은 뒤로 못 가고 차는 궁성 대각선을 지난다', () => {
  const pawn = generals(put(empty, [rc(5, 4), 'P']));
  assert.deepEqual(sorted(janggi.targets(pawn, rc(5, 4), 'c')), [rc(4, 4), rc(5, 3), rc(5, 5)]);
  const chariot = put(empty, [rc(0, 3), 'R'], [rc(8, 4), 'K'], [rc(9, 0), 'k']);
  assert.equal(janggi.targets(chariot, rc(0, 3), 'c').includes(rc(2, 5)), true); // 귀퉁이 → 중앙 → 반대 귀퉁이
});

test('장기: 장군을 자초하는 수는 막고, 외통이면 이긴다', () => {
  // 한 차가 겨누는 줄을 막고 선 초 사는 그 줄을 벗어날 수 없다.
  const pinned = put(empty, [rc(9, 4), 'K'], [rc(8, 4), 'A'], [rc(0, 4), 'r'], [rc(2, 5), 'k']);
  assert.deepEqual(janggi.targets(pinned, rc(8, 4), 'c'), [rc(7, 4)]);
  // 한 궁이 궁성 구석에 갇힌 채 초 차 둘이 0행과 1행을 덮으면 외통이다.
  const mate = put(empty, [rc(0, 3), 'k'], [rc(9, 4), 'K'], [rc(1, 0), 'R'], [rc(5, 8), 'R']);
  assert.equal(janggi.apply(mate, { from: rc(5, 8), to: rc(0, 8) }, 'c').result, 'win');
  assert.equal(janggi.apply(mate, { from: rc(5, 8), to: rc(0, 8) }, 'h'), null); // 남의 기물은 못 움직인다
});

test('장기: 빅장이면 무승부', () => {
  const board = put(empty, [rc(9, 4), 'K'], [rc(0, 4), 'k'], [rc(5, 0), 'R']);
  assert.equal(janggi.apply(board, { from: rc(5, 0), to: rc(5, 1) }, 'c').result, 'draw');
});

test('장기: 상대 기물이나 빈 칸을 집으면 이동 칸이 없다', () => {
  assert.deepEqual(janggi.targets(JANGGI_INITIAL, rc(4, 4), 'c'), []);
  assert.deepEqual(janggi.targets(JANGGI_INITIAL, rc(0, 0), 'c'), []);
  assert.equal(janggi.apply(JANGGI_INITIAL, { from: rc(9, 0), to: rc(0, 0) }, 'c'), null);
});
