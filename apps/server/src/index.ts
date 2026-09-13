import 'dotenv/config';
import { defineServer, defineRoom } from 'colyseus';
import { BOARD_ROOM, ROOM_NAME } from '@wse/shared';
import { LobbyRoom } from './rooms/LobbyRoom.js';
import { BoardRoom } from './rooms/BoardRoom.js';
import { listRooms } from './rooms/directory.js';
import type { Request, Response, NextFunction } from 'express';
const port = Number(process.env.PORT ?? 2567);
const host = '127.0.0.1';
const configuredOrigins = (process.env.CLIENT_ORIGIN ?? '').split(',').map(value => value.trim()).filter(Boolean);
const server = defineServer({
  rooms: { [ROOM_NAME]: defineRoom(LobbyRoom), [BOARD_ROOM]: defineRoom(BoardRoom) },
  express: app => {
    app.use((req: Request, res: Response, next: NextFunction) => {
      const origin = req.headers.origin;
      if (origin) {
        let allowed = configuredOrigins.includes(origin);
        try {
          const source = new URL(origin);
          const requestedHost = req.headers.host?.split(':')[0];
          allowed ||= source.hostname === requestedHost && source.port === '5173';
        } catch { /* Invalid origins are not allowed. */ }
        if (allowed) { res.setHeader('Access-Control-Allow-Origin', origin); res.setHeader('Vary', 'Origin'); }
      }
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      if (req.method === 'OPTIONS') { res.sendStatus(204); return; }
      next();
    });
    app.get('/health', (_req: Request, res: Response) => res.json({ ok: true }));
    app.get('/rooms', (_req: Request, res: Response) => res.json(listRooms()));
  },
});
server.listen(port, host);
console.log(`Game server listening on ${host}:${port}`);
