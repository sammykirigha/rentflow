FROM node:22-slim AS builder

ENV NODE_ENV=build

WORKDIR /api

RUN npm install -g @nestjs/cli

RUN npm install -g pnpm

COPY package*.json ./
RUN pnpm install

COPY . .

RUN pnpm run build \
    && pnpm prune --production

FROM node:22-slim
ENV NODE_ENV=production
WORKDIR /api

COPY --from=builder  /api/package*.json ./
COPY --from=builder  /api/node_modules/ ./node_modules/
COPY --from=builder  /api/dist/ ./dist/

EXPOSE 9090
CMD ["node", "dist/main"]
