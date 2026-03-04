import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { ClientToServerEvents, InterServerEvents, ServerToClientEvents, SocketData } from './io.types';
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
                  origin: 'http://localhost:5173',
              },
          },
);

const port = process.env.PORT ?? '3000';

io.on('connection', (socket) => {
    console.log('a user connected');
    roomHandler(io, socket);
});

server.listen(port, () => {
    console.log(`listening on *:${port}`);
});
