import { Schema, MapSchema, type } from '@colyseus/schema';

export class BoardPlayer extends Schema {
  @type('string') nickname = '';
  @type('string') seat = '';
  @type('string') fieldSkin = 'classic';
  @type('string') pieceSkin = 'classic';
}
export class BoardState extends Schema {
  @type('string') code = '';
  @type('string') title = '';
  @type('boolean') locked = false;
  @type('string') game = 'omok';
  @type('string') phase = 'lobby';
  @type('string') hostId = '';
  @type('string') board = '';
  @type('string') turn = '';
  @type('string') winner = '';
  @type('string') lastMove = '';
  @type({ map: BoardPlayer }) players = new MapSchema<BoardPlayer>();
}
