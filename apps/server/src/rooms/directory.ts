import type { BoardGameId, DifficultyId, MapId } from '@wse/shared';
import { randomInt } from 'node:crypto';

export type RoomListing = { code: string; title: string; game: 'survivors' | BoardGameId; players: number; maxPlayers: number; locked: boolean; map?: MapId; difficulty?: DifficultyId; phase: string };

const rooms = new Map<string, RoomListing>();
const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const reservedCodes = new Set<string>();
export function reserveRoomCode(): string {
  let code: string;
  do { code = Array.from({ length: 6 }, () => alphabet[randomInt(alphabet.length)]).join(''); } while (reservedCodes.has(code));
  reservedCodes.add(code);
  return code;
}
export const listRooms = (): RoomListing[] => [...rooms.values()].filter(room => room.phase === 'lobby' && room.players < room.maxPlayers);
export const addRoom = (room: RoomListing): void => { rooms.set(room.code, room); };
export const updateRoom = (code: string, changes: Partial<RoomListing>): void => { const room = rooms.get(code); if (room) Object.assign(room, changes); };
export const removeRoom = (code: string): void => { rooms.delete(code); reservedCodes.delete(code); };

export function roomTitle(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim().slice(0, 40) : fallback;
}

export function roomPassword(value: unknown): string {
  return typeof value === 'string' ? value.slice(0, 64) : '';
}
