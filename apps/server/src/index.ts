import 'dotenv/config';
import { defineServer, defineRoom } from 'colyseus';
import { BOARD_ROOM, ROOM_NAME } from '@wse/shared';
import { LobbyRoom } from './rooms/LobbyRoom.js';
import { BoardRoom } from './rooms/BoardRoom.js';
import { listRooms } from './rooms/directory.js';
import type { Request, Response, NextFunction } from 'express';
const port = Number(process.env.PORT ?? 2567);
const origin = process.env.CLIENT_ORIGIN ?? 'http://localhost:5173';
const server = defineServer({
  rooms: { [ROOM_NAME]: defineRoom(LobbyRoom), [BOARD_ROOM]: defineRoom(BoardRoom) },
  express: app => {
    app.use((req: Request, res: Response, next: NextFunction) => {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      if (req.method === 'OPTIONS') { res.sendStatus(204); return; }
      next();
    });
    app.get('/health', (_req: Request, res: Response) => res.json({ ok: true }));
    app.get('/rooms', (_req: Request, res: Response) => res.json(listRooms()));
  },
});
server.listen(port, '127.0.0.1');
console.log(`Game server listening on http://localhost:${port}`);
