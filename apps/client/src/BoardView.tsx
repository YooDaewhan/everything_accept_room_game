import { useEffect, useState } from 'react';
import { BOARD_GAMES, BOARD_MSG, BOARD_RULES, type BoardGameId, type BoardStateView } from '@wse/shared';
import type { Room } from '@colyseus/sdk';
import { FIELD_SKINS, PIECE_SKINS } from './boardSkins';
import { RoomSettings } from './RoomSettings';
import { ChatPanel } from './ChatPanel';

type Props = { room: Room; leave: () => void };
const CHESS_PIECES: Record<string, string> = { p: '♟', n: '♞', b: '♝', r: '♜', q: '♛', k: '♚' };
const JANGGI_PIECES: Record<string, string> = { k: '漢', a: '士', e: '象', h: '馬', r: '車', c: '包', p: '兵' };
const JANGGI_CHO: Record<string, string> = { K: '楚', P: '卒' };

// 체스만 FEN 이라 판을 칸 배열로 펴 준다. 나머지는 문자열이 곧 판이다.
function squaresOf(game: BoardGameId, board: string): string[] {
  if (game !== 'chess') return [...board];
  return board.split(' ')[0].split('/').flatMap(row => [...row].flatMap(char => /\d/.test(char) ? Array<string>(Number(char)).fill('.') : char));
}

// 방에 막 들어간 순간에는 아직 상태가 도착하지 않는다.
function snapshot(room: Room): BoardStateView {
  const state = room.state as Partial<BoardStateView> | undefined;
  return { code: state?.code ?? '', title: state?.title ?? '', locked: state?.locked ?? false, game: state?.game ?? 'omok', phase: state?.phase ?? 'lobby', hostId: state?.hostId ?? '',
    board: state?.board ?? '', turn: state?.turn ?? '', winner: state?.winner ?? '', lastMove: state?.lastMove ?? '',
    players: new Map([...state?.players ?? []].map(([id, player]) => [id, { nickname: player.nickname, seat: player.seat, fieldSkin: player.fieldSkin, pieceSkin: player.pieceSkin }])) };
}

export function BoardView({ room, leave }: Props): React.JSX.Element {
  const [view, setView] = useState<BoardStateView>(() => snapshot(room));
  const [selected, setSelected] = useState(-1);

  useEffect(() => {
    const sync = () => { setView(snapshot(room)); setSelected(-1); };
    room.onStateChange(sync); sync();
    return () => { room.onStateChange.remove(sync); };
  }, [room]);

  const game = BOARD_GAMES[view.game] ?? BOARD_GAMES.omok;
  const seatNames = game.seatNames as Record<string, string>;
  const me = view.players.get(room.sessionId);
  const isHost = view.hostId === room.sessionId;
  const myTurn = view.phase === 'running' && me?.seat === view.turn;
  const opponent = [...view.players.entries()].find(([id]) => id !== room.sessionId)?.[1];
  const squares = squaresOf(view.game, view.board);
  const fields = FIELD_SKINS[view.game];
  const pieces = PIECE_SKINS[view.game];
  const lastIndex = view.game === 'omok' ? Number(view.lastMove) : -1;
  // 서버와 같은 규칙 모듈로 뽑은 이동 가능 칸. 판정은 그대로 서버가 한다.
  const targets = selected < 0 || !myTurn ? [] : BOARD_RULES[view.game].targets(view.board, selected, me?.seat ?? '');

  function play(index: number): void {
    if (!myTurn) return;
    if (view.game === 'omok') { room.send(BOARD_MSG.MOVE, index); return; }
    if (targets.includes(index)) { room.send(BOARD_MSG.MOVE, { from: selected, to: index }); setSelected(-1); return; }
    setSelected(BOARD_RULES[view.game].targets(view.board, index, me?.seat ?? '').length > 0 ? index : -1);
  }

  const status = view.phase === 'lobby' ? (view.players.size < 2 ? '상대를 기다리는 중입니다.' : isHost ? '시작할 수 있습니다.' : '방장이 시작하기를 기다려 주세요.')
    : view.phase === 'over' ? (view.winner === 'draw' ? '무승부입니다.' : view.winner === room.sessionId ? '이겼습니다.' : '졌습니다.')
    : myTurn ? '내 차례입니다.' : `${opponent?.nickname ?? '상대'}의 차례입니다.`;
  const winner = [...view.players.entries()].find(([id]) => id === view.winner)?.[1];
  const resultTitle = view.winner === 'draw' ? '무승부' : winner ? `${winner.nickname} 승리!` : '대국 종료';
  const resultDetail = view.winner === 'draw' ? '이번 대국은 무승부로 끝났습니다.' : winner ? `${seatNames[winner.seat]} 진영이 이겼습니다.` : '상대가 방을 나갔습니다.';

  return <section className="board-screen">
    <div className="board-layout">
      <aside className="board-side">
        <div className="board-side-heading"><span className="eyebrow">BOARD / {view.game.toUpperCase()}</span><div className="board-side-title-row"><h2>{view.title || game.name}</h2><button className="text-button" onClick={leave}>← 방 나가기</button></div><p>{game.name} · {game.description}</p></div>
        <div className="party-title"><span>대국자</span><small>{view.players.size} / 2</small></div>
        {[...view.players.entries()].map(([id, player]) => <div className={`party-slot occupied ${view.phase === 'running' && player.seat === view.turn ? 'turn' : ''}`} key={id}>
          <div className="party-avatar">{seatNames[player.seat] ?? '?'}</div>
          <div><strong>{player.nickname}{id === room.sessionId ? ' (나)' : ''}</strong><small>{seatNames[player.seat]} · {id === view.hostId ? '방장' : '멤버'}</small></div>
        </div>)}
        {view.players.size < 2 && <div className="party-slot"><div className="party-avatar">+</div><div><strong>상대를 기다리는 중</strong><small>빈 자리</small></div></div>}
        <div className="invite-box"><small>초대 코드</small><div><strong>{room.roomId}</strong><button className="copy-button" onClick={() => void navigator.clipboard.writeText(room.roomId)}>복사</button></div><p>친구에게 이 코드를 알려주세요.</p></div>
        <ChatPanel room={room} messageType={BOARD_MSG.CHAT} nickname={me?.nickname ?? ''} />
        <div className="board-status" role="status">{status}</div>
        {view.phase === 'lobby' && isHost && <button disabled={view.players.size < 2} onClick={() => room.send(BOARD_MSG.START)}>대국 시작 →</button>}
      </aside>
      <div className="board-main">
      {view.phase === 'lobby' && isHost && <RoomSettings title={view.title} locked={view.locked} onSave={settings => room.send(BOARD_MSG.SETTINGS, settings)} />}
      {view.phase === 'lobby' ? <div className="board-skin-section option-section">
        <div className="section-head"><div><span className="eyebrow">CUSTOMIZE / SELECT</span><h3>스킨 선택</h3></div><small>각자 선택</small></div>
        <p>판 스킨은 내 진영의 절반에, 말 스킨은 내 기물에 적용됩니다.</p>
        <div className="skin-group"><h4>판 · 필드 스킨</h4><div className="board-skin-grid">{fields.map(option => <button key={option.id} type="button" aria-pressed={me?.fieldSkin === option.id} className={`board-skin-card ${me?.fieldSkin === option.id ? 'selected' : ''}`} onClick={() => room.send(BOARD_MSG.SKIN, { kind: 'field', id: option.id })}><span className="board-skin-preview" style={{ '--skin-light': option.light, '--skin-dark': option.dark } as React.CSSProperties}><span /><span /><span /><span /></span><span className="board-skin-choice">{me?.fieldSkin === option.id ? '선택됨' : '선택하기'}</span><strong>{option.name}</strong><small>{option.description}</small></button>)}</div></div>
        <div className="skin-group"><h4>말 · 기물 스킨</h4><div className="board-skin-grid">{pieces.map(option => <button key={option.id} type="button" aria-pressed={me?.pieceSkin === option.id} className={`board-skin-card ${me?.pieceSkin === option.id ? 'selected' : ''}`} onClick={() => room.send(BOARD_MSG.SKIN, { kind: 'piece', id: option.id })}><span className={`piece-skin-preview ${option.id}`}>{option.preview}</span><span className="board-skin-choice">{me?.pieceSkin === option.id ? '선택됨' : '선택하기'}</span><strong>{option.name}</strong><small>{option.description}</small></button>)}</div></div>
      </div> : <div className={`board-grid ${view.game}`} style={{ '--cols': game.cols, '--rows': game.rows } as React.CSSProperties}>
        {squares.map((square, index) => {
          const dark = (index % game.cols + Math.floor(index / game.cols)) % 2 === 1;
          const row = Math.floor(index / game.cols);
          const seat = row < game.rows / 2 ? game.seats[1] : game.seats[0];
          const owner = [...view.players.values()].find(player => player.seat === seat);
          const cellSkin = fields.find(option => option.id === owner?.fieldSkin) ?? fields[0];
          const pieceSeat = square === '.' ? '' : view.game === 'omok' ? (square === 'b' ? game.seats[0] : game.seats[1]) : (square === square.toUpperCase() ? game.seats[0] : game.seats[1]);
          const pieceOwner = [...view.players.values()].find(player => player.seat === pieceSeat);
          const pieceSkin = pieces.find(option => option.id === pieceOwner?.pieceSkin) ?? pieces[0];
          const hint = targets.includes(index) ? (square === '.' ? 'move' : 'capture') : '';
          return <button key={index} type="button" disabled={!myTurn} onClick={() => play(index)}
            style={{ '--skin-light': cellSkin.light, '--skin-dark': cellSkin.dark, '--skin-border': cellSkin.border } as React.CSSProperties}
            aria-label={`${index % game.cols + 1}, ${Math.floor(index / game.cols) + 1}${square === '.' ? ' 빈 칸' : ''}${hint ? ' 이동 가능' : ''}`}
            className={`board-cell ${dark ? 'dark' : ''} ${index === selected ? 'selected' : ''} ${index === lastIndex ? 'last' : ''} ${hint} ${view.game === 'omok' ? `${index % game.cols === 0 ? 'edge-left' : ''} ${index % game.cols === game.cols - 1 ? 'edge-right' : ''} ${row === 0 ? 'edge-top' : ''} ${row === game.rows - 1 ? 'edge-bottom' : ''}` : ''}`}>
            {square === '.' ? null
              : view.game === 'omok' ? <span className={`stone ${square} skin-${pieceSkin.id}`} />
              : view.game === 'chess' ? <span className={`piece skin-${pieceSkin.id} ${square === square.toUpperCase() ? 'white' : 'black'}`}>{CHESS_PIECES[square.toLowerCase()]}</span>
              : <span className={`piece janggi skin-${pieceSkin.id} ${square === square.toUpperCase() ? 'cho' : 'han'}`}>{JANGGI_CHO[square] ?? JANGGI_PIECES[square.toLowerCase()]}</span>}
          </button>;
        })}
      </div>}
      </div>
    </div>
    {view.phase === 'over' && <div className="board-result-backdrop"><div className="board-result-panel" role="dialog" aria-modal="true" aria-labelledby="board-result-title"><span className="eyebrow">MATCH COMPLETE / {game.name}</span><div className="board-result-mark">{view.winner === 'draw' ? '◇' : view.winner === room.sessionId ? '✦' : '◆'}</div><h2 id="board-result-title">{resultTitle}</h2><p>{resultDetail}</p><div className="board-result-actions"><button onClick={() => room.send(BOARD_MSG.REMATCH)}>다시하기 <span>↗</span></button><button className="secondary" onClick={leave}>방 나가기</button></div><small>다시하기를 누르면 선후공이 바뀝니다.</small></div></div>}
  </section>;
}
