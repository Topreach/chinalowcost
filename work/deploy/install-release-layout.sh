#!/usr/bin/env bash
set -Eeuo pipefail
ROOT=/opt/chinalowcost
[[ "$EUID" -eq 0 ]] || { echo 'Run as root.' >&2; exit 1; }
[[ -f "$ROOT/.env" && -d "$ROOT/data" && -f "$ROOT/backend/server.cjs" ]] || { echo 'Existing application layout not found.' >&2; exit 1; }
getent passwd chinalowcost >/dev/null
SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
chown root:chinalowcost "$ROOT" "$ROOT/.env"
chmod 0751 "$ROOT"
chmod 0640 "$ROOT/.env"
install -d -m 0755 -o root -g root "$ROOT/public-maintenance"
install -m 0644 -o root -g root "$SCRIPT_DIR/maintenance.html" "$ROOT/public-maintenance/maintenance.html"
install -d -m 0750 -o root -g chinalowcost "$ROOT/releases"
if [[ ! -e "$ROOT/current" && ! -L "$ROOT/current" ]]; then ln -s "$ROOT" "$ROOT/current"; fi
install -d -m 0700 /root/chinalowcost-release-backups
cp -a /etc/systemd/system/chinalowcost.service "/root/chinalowcost-release-backups/service-before-releases-$(date -u +%Y%m%dT%H%M%SZ)"
cat > /etc/systemd/system/chinalowcost.service <<'UNIT'
[Unit]
Description=ChinaLowCost application
After=network.target
[Service]
Type=simple
User=chinalowcost
Group=chinalowcost
WorkingDirectory=/opt/chinalowcost/current
Environment=MAINTENANCE_FILE=/opt/chinalowcost/maintenance.flag
ExecStart=/usr/bin/node --env-file=/opt/chinalowcost/.env /opt/chinalowcost/current/backend/server.cjs
Restart=on-failure
RestartSec=5
TimeoutStopSec=60
UMask=0077
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/chinalowcost/data
[Install]
WantedBy=multi-user.target
UNIT
systemctl daemon-reload
printf 'Release layout is installed. Existing process was not restarted. Configure the Nginx maintenance page before the first release.\n'