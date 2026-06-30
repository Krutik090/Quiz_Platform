FROM node:20-alpine AS base
WORKDIR /repo

FROM base AS deps
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/package.json
COPY apps/server/package.json apps/server/package.json
COPY apps/client/package.json apps/client/package.json
RUN npm ci

FROM deps AS build
COPY packages/shared packages/shared
COPY apps/server apps/server
RUN npm run build --workspace=packages/shared && npm run build --workspace=apps/server

FROM node:20-alpine AS runtime
WORKDIR /repo
ENV NODE_ENV=production
COPY --from=deps /repo/node_modules ./node_modules
COPY --from=build /repo/packages/shared/dist ./packages/shared/dist
COPY --from=build /repo/packages/shared/package.json ./packages/shared/package.json
COPY --from=build /repo/apps/server/dist ./apps/server/dist
COPY --from=build /repo/apps/server/package.json ./apps/server/package.json
RUN mkdir -p /repo/apps/server/uploads && chown -R node:node /repo/apps/server/uploads
WORKDIR /repo/apps/server
EXPOSE 4000
USER node
CMD ["node", "dist/server.js"]
