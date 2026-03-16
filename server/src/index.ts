import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { ClientToServerEvents, InterServerEvents, ServerToClientEvents, SocketData } from './io.types';
import { Room } from './room.types';
import roomHandler from './ioHandlers/room';

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
});

server.listen(port, () => {
    console.log(`listening on *:${port}`);
});
