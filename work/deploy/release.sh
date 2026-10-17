#!/usr/bin/env bash
set -Eeuo pipefail
umask 027
ROOT=/opt/chinalowcost
SOURCE=/opt/chinalowcost-source
SERVICE=chinalowcost
REVISION="${1:-}"
[[ "$EUID" -eq 0 ]] || { echo 'Run as root.' >&2; exit 1; }
[[ "$REVISION" =~ ^[0-9a-f]{40}$ ]] || { echo 'Supply the full tested main-branch commit SHA.' >&2; exit 1; }
[[ -f "$ROOT/.env" && -d "$ROOT/data" && -L "$ROOT/current" && -d "$SOURCE/.git" ]] || { echo 'Install the release layout and source checkout first.' >&2; exit 1; }
nginx -t
nginx -T 2>/dev/null | grep -F "$ROOT/maintenance.flag" >/dev/null || { echo 'Configure the Nginx maintenance guard before deployment.' >&2; exit 1; }
exec 9>"$ROOT/.deployment.lock"
flock -n 9 || { echo 'Another deployment is running.' >&2; exit 1; }
[[ ! -e "$ROOT/maintenance.flag" ]] || { echo 'Maintenance is already active; resolve the previous release first.' >&2; exit 1; }
ORIGIN=$(git -C "$SOURCE" remote get-url origin)
[[ "$ORIGIN" == 'https://github.com/Topreach/chinalowcost.git' || "$ORIGIN" == 'git@github.com:Topreach/chinalowcost.git' ]] || { echo 'Unexpected source repository.' >&2; exit 1; }
git -C "$SOURCE" fetch --prune origin main
git -C "$SOURCE" merge-base --is-ancestor "$REVISION" origin/main || { echo 'Commit is not on main.' >&2; exit 1; }
STAMP=$(date -u +%Y%m%dT%H%M%SZ)
CANDIDATE="$ROOT/releases/$STAMP-$REVISION"
PREVIOUS=$(readlink -f "$ROOT/current")
[[ "$PREVIOUS" == "$ROOT" || "$PREVIOUS" == "$ROOT/releases/"* ]] || { echo 'Unexpected previous release path.' >&2; exit 1; }
install -d -m 0750 -o chinalowcost -g chinalowcost "$CANDIDATE"
git -C "$SOURCE" archive "$REVISION" | tar --no-same-owner -xf - -C "$CANDIDATE"
chown -R chinalowcost:chinalowcost "$CANDIDATE"
(cd "$CANDIDATE" && runuser -u chinalowcost -- npm ci --omit=dev --ignore-scripts --cache "$CANDIDATE/.npm-cache" && runuser -u chinalowcost -- npm run build && runuser -u chinalowcost -- npm test)
chown -R root:chinalowcost "$CANDIDATE"
chmod -R go-w "$CANDIDATE"
ln -s "$ROOT/.env" "$CANDIDATE/.env"
ln -s "$ROOT/data" "$CANDIDATE/data"
(cd "$CANDIDATE" && runuser -u chinalowcost -- env MAINTENANCE_FILE="$ROOT/maintenance.flag" node --env-file="$ROOT/.env" backend/release-preflight.cjs)
BACKUP="/root/chinalowcost-release-backups/$STAMP-$REVISION"
install -d -m 0700 "$BACKUP"
cp -a "$ROOT/.env" "$BACKUP/environment"
systemctl cat "$SERVICE" > "$BACKUP/service.txt"
NEEDS_ROLLBACK=0
rollback() {
  status=$?
  trap - ERR
  if [[ "$NEEDS_ROLLBACK" == 1 ]]; then
    echo 'Candidate failed before public traffic was enabled; restoring the previous release.' >&2
    systemctl stop "$SERVICE" || true
    if [[ -f "$BACKUP/app.sqlite" ]]; then
      (cd "$ROOT" && node --env-file="$ROOT/.env" "$CANDIDATE/backend/release-database.cjs" restore "$BACKUP/app.sqlite") || { echo 'Database restore failed. Maintenance remains enabled.' >&2; exit 1; }
    fi
    ln -s "$PREVIOUS" "$ROOT/.rollback-current"
    mv -Tf "$ROOT/.rollback-current" "$ROOT/current"
    if systemctl start "$SERVICE"; then
      RESTORED=0
      for attempt in $(seq 1 30); do
        if curl --fail --silent --max-time 2 http://127.0.0.1:3100/readyz >/dev/null || curl --fail --silent --max-time 2 http://127.0.0.1:3100/ >/dev/null; then RESTORED=1; break; fi
        sleep 1
      done
      [[ "$RESTORED" == 1 ]] || { echo 'Rollback health check failed. Maintenance remains enabled.' >&2; exit 1; }
      rm -f -- "$ROOT/maintenance.flag"
      echo 'Previous release restarted. Review logs and verify service health.' >&2
    else
      echo 'Previous release failed to start. Maintenance remains enabled.' >&2
    fi
  fi
  exit "$status"
}
trap rollback ERR
touch "$ROOT/maintenance.flag"
NEEDS_ROLLBACK=1
systemctl stop "$SERVICE"
(cd "$ROOT" && node --env-file="$ROOT/.env" "$CANDIDATE/backend/release-database.cjs" backup "$BACKUP/app.sqlite")
ln -s "$CANDIDATE" "$ROOT/.next-current"
mv -Tf "$ROOT/.next-current" "$ROOT/current"
systemctl start "$SERVICE"
HEALTHY=0
for attempt in $(seq 1 30); do
  if curl --fail --silent --max-time 2 http://127.0.0.1:3100/readyz >/dev/null; then HEALTHY=1; break; fi
  sleep 1
done
[[ "$HEALTHY" == 1 ]] || { echo 'Candidate did not become ready.' >&2; false; }
printf '%s\n' "$REVISION" > "$ROOT/current-revision"
rm -f -- "$ROOT/maintenance.flag"
NEEDS_ROLLBACK=0
trap - ERR
printf 'Released %s. Previous release: %s. Database snapshot: %s/app.sqlite\n' "$REVISION" "$PREVIOUS" "$BACKUP"