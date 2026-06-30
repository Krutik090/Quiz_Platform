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
COPY apps/client apps/client
RUN npm run build --workspace=packages/shared && npm run build --workspace=apps/client

FROM nginx:1.27-alpine AS runtime
COPY --from=build /repo/apps/client/dist /usr/share/nginx/html
COPY nginx/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
