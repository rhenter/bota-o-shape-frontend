#!/bin/sh
# Portal on 3101, gym admin on 3102, Caddy on Railway's $PORT.
set -eu

HOSTNAME=127.0.0.1 PORT=3101 node /srv/out/portal/apps/portal/server.js &
HOSTNAME=127.0.0.1 PORT=3102 node /srv/out/gym/apps/gym_admin/server.js &
exec caddy run --config /srv/Caddyfile --adapter caddyfile
