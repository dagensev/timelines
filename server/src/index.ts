import express from 'express';
import { createServer } from 'node:http';
import { resolve } from 'node:path';
import { Server } from 'socket.io';
import { initDb } from './db/index';
import { getCardSets } from './db/cards';
import { ClientToServerEvents, InterServerEvents, ServerToClientEvents, SocketData } from './io.types';
import { Room } from './room.types';
import roomHandler from './ioHandlers/room';
import gameHandler from './ioHandlers/game';

const environment = process.env.ENVIRONMENT;

const app = express();
const server = createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(
    server,
    environment === 'production'
        ? {}
        : {
              cors: {
                  origin: (origin, callback) => {
                      if (!origin) {
                          callback(null, true);
                          return;
                      }

                      const isAllowedLocalOrigin = /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);
                      callback(isAllowedLocalOrigin ? null : new Error('Origin not allowed'), isAllowedLocalOrigin);
                  },
              },
          },
);

const port = process.env.PORT ?? '3000';

// In-memory room state
const rooms: Map<string, Room> = new Map<string, Room>();

io.on('connection', (socket) => {
    roomHandler(io, socket, rooms);
    gameHandler(io, socket, rooms);
});

app.use(express.json());

app.get('/api/card-sets', (_req, res) => {
    res.json(getCardSets());
});

const staticPath = process.env.STATIC_PATH;
if (staticPath) {
    app.use(express.static(staticPath));
    app.use((_req, res) => {
        res.sendFile(resolve(staticPath, 'index.html'));
    });
}

initDb();

server.listen(port, () => {
    console.log(`listening on *:${port}`);
});
