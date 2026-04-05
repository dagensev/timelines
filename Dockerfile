# Stage 1: Build client
FROM node:24-alpine AS client-builder
WORKDIR /app
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# Stage 2: Build server
FROM node:24-alpine AS server-builder
WORKDIR /app
COPY server/package*.json ./
RUN npm ci
COPY server/ ./
RUN npm run build

# Stage 3: Production image
FROM node:24-alpine AS production
WORKDIR /app
COPY --from=server-builder /app/dist ./dist
COPY --from=server-builder /app/node_modules ./node_modules
COPY --from=server-builder /app/package.json ./
COPY --from=client-builder /app/dist ./public
EXPOSE 3000
CMD ["node", "dist/src/index.js"]
