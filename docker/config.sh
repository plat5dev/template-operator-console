#!/bin/sh
# Writes /config.js from the environment, so one image serves any deployment.
# The nginx image runs /docker-entrypoint.d/*.sh before it starts.
set -eu

js() { printf '"%s"' "$(printf '%s' "$1" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g' -e 's/</\\u003c/g')"; }

cat > /usr/share/nginx/html/config.js <<CONFIG
window.__CONSOLE_CONFIG__ = {
  gatewayUrl: $(js "${GATEWAY_URL:-}"),
  issuer: $(js "${AUTH_ISSUER:-}"),
  clientId: $(js "${AUTH_CLIENT_ID:-}"),
  scopes: $(js "${AUTH_SCOPES:-}"),
  audience: $(js "${AUTH_AUDIENCE:-}"),
}
CONFIG
