#!/usr/bin/env bash
# everygame.wsestudio.net 배포 스크립트.
# 빌드는 로컬에서 한다. 서버는 1 vCPU / RAM 961MB 라 vite 빌드를 돌리면 swap 을 긁는다.
#
# 사용법:
#   bash deploy.sh          코드만 배포 (기본)
#   bash deploy.sh --deps   package.json / package-lock.json 이 바뀐 경우
set -euo pipefail
cd "$(dirname "$0")"

HOST=root@49.247.136.17
SSH="ssh -i $HOME/.ssh/id_ed25519 -o BatchMode=yes"
URL=https://everygame.wsestudio.net
WEBROOT=/var/www/everygame/html
APPDIR=/srv/everygame
SERVICE=everygame

echo "==> build (VITE_GAME_SERVER_URL=$URL/gs)"
VITE_GAME_SERVER_URL=$URL/gs npm run build

echo "==> client -> $WEBROOT"
tar czf - -C apps/client/dist . | $SSH $HOST "
  rm -rf $WEBROOT/* &&
  tar xzf - -C $WEBROOT &&
  chown -R www-data:www-data $WEBROOT"

# tar 는 rsync --delete 가 없어서 지운 파일이 서버에 남는다. dist 를 통째로 갈아끼운다.
echo "==> server -> $APPDIR"
tar czf - package.json package-lock.json \
  apps/server/dist apps/server/package.json \
  packages/shared/dist packages/shared/package.json | $SSH $HOST "
  rm -rf $APPDIR/apps/server/dist $APPDIR/packages/shared/dist &&
  tar xzf - -C $APPDIR"

if [ "${1:-}" = "--deps" ]; then
  echo "==> npm ci (1 vCPU 라 2~3분 걸린다)"
  $SSH $HOST "cd $APPDIR && npm ci --omit=dev -w @wse/server --include-workspace-root"
fi

$SSH $HOST "chown -R $SERVICE:$SERVICE $APPDIR && systemctl restart $SERVICE"

echo "==> health check"
sleep 3
curl -fsS "$URL/gs/health" && echo " <- OK"
