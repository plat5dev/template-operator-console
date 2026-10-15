# Static console behind nginx. Settings come from the container's environment at
# start (docker/config.sh), not the build: GATEWAY_URL, AUTH_ISSUER, AUTH_CLIENT_ID,
# and optionally AUTH_SCOPES and AUTH_AUDIENCE.
# dev: the Vite dev server on :5412, with this directory mounted over /app
# (docker-compose.yml). Edits reload in the browser. Its node_modules is a volume,
# brought up to date on each start.
FROM oven/bun:1 AS dev
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
EXPOSE 5412
CMD ["sh", "-c", "bun install --frozen-lockfile && exec bun run dev --host 0.0.0.0 --port 5412 --strictPort"]

# The production image: the build, behind nginx.
FROM --platform=$BUILDPLATFORM oven/bun:1 AS build
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build:runtime

FROM nginx:1-alpine
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY docker/headers.conf /etc/nginx/snippets/headers.conf
COPY --chmod=755 docker/config.sh /docker-entrypoint.d/40-config.sh
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
