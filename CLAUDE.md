# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Timelines is a multiplayer game lobby system with real-time communication. It's a monorepo with a React 19 frontend (`client/`) and an Express + Socket.IO backend (`server/`).

## Commands

### Client (run from `client/`)
```bash
npm run dev      # Vite dev server with HMR
npm run build    # tsc -b && vite build
npm run lint     # ESLint
npm run preview  # Preview production build
```

### Server (run from `server/`)
```bash
npm run dev      # tsx watch mode with .env loaded
npm run build    # tsc to dist/
npm run start    # node dist/index.js with .env loaded
```

## Architecture

### Real-Time Communication
All game state flows through Socket.IO. The client emits events and the server broadcasts `room:state` back to all room members.

**Client → Server:** `room:create`, `room:join`, `room:leave`, `room:start`  
**Server → Client:** `room:state` (broadcasts full room state to all players in the room)

All events use Socket.IO acknowledgment callbacks for request-response handling.

### Server State
Rooms are stored entirely in-memory as `Map<string, Room>` in `server/src/index.ts`. There is no database. Rooms auto-delete when the last player leaves; the host role is reassigned when the host disconnects.

### Client State
- React component state for UI rendering
- `localStorage` for persistence: room state, username, password, and pending room code
- Custom `useLocalStorage` hook (`client/src/hooks/useLocalStorage.tsx`) syncs state
- Socket.IO `room:state` listener updates room state in real-time

### Player Identity
Players get a UUID on first visit, stored in `localStorage` via `client/src/playerId.ts`. This is used for host authorization and reconnection.

### Room Codes
6-character hex strings generated server-side via `randomBytes(3).toString('hex')`. Max 8 players per room. Optional password protection.

### Environment Variables
- **Server**: `PORT` (default 3000), `ENVIRONMENT=production` to disable CORS
- **Client**: `VITE_ENVIRONMENT=production` to use production Socket.IO URL

### Type Sharing
Both `client/src/room.types.ts` and `server/src/room.types.ts` define the same `Room` and related types — they are duplicated, not shared via a package.

## Key Files
- `server/src/index.ts` — Server entry, in-memory room map, Socket.IO setup
- `server/src/ioHandlers/room.ts` — All room event handlers
- `server/src/io.types.ts` — Socket.IO event type definitions
- `client/src/socket.ts` — Singleton Socket.IO client instance
- `client/src/routes.tsx` — React Router config (`/` and `/room/:roomId`)
- `client/src/pages/[roomId].tsx` — Room page
- `client/src/App.tsx` — Landing/lobby page (create/join UI)
