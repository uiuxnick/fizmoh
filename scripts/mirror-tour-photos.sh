#!/usr/bin/env bash
#
# Copies every tour photograph onto our own server.
#
# WhatsApp fetches media from the URL we give it, and a host that serves a
# browser happily may still refuse Meta's fetcher. When that happens Meta
# accepts the send, fails to download the image, and reports nothing — the
# customer simply receives no picture. Unsplash behaves exactly this way.
#
# Run after adding tours with remote images:
#   SSHPASS=… bash scripts/mirror-tour-photos.sh
#
set -euo pipefail

HOST="${DEPLOY_HOST:-root@187.127.119.207}"
ROOT="/home/fizmoh-platform"

sshpass -e ssh -o StrictHostKeyChecking=no "$HOST" '
  set -a; source /home/fizmoh-platform/shared/.env.production; set +a
  DB=$(echo "$DATABASE_URL" | sed "s/?.*$//")
  UPLOADS=/home/fizmoh-platform/shared/uploads
  BASE="https://app.fizmoh.cloud/api/media"
  mkdir -p "$UPLOADS"

  psql "$DB" -tA -F"|" -c "select id, name, ((media #>> '"'"'{}'"'"')::json->0->>'"'"'url'"'"') from \"Tour\" where media is not null" |
  while IFS="|" read -r id name url; do
    case "$url" in
      http*app.fizmoh.cloud*) echo "  ok      $name"; continue ;;
      http*) ;;
      *) continue ;;
    esac
    file="$(uuidgen | tr "A-Z" "a-z").jpg"
    if curl -s -f -L --max-time 30 -o "$UPLOADS/$file" "$url"; then
      chown wptou2922:wptou2922 "$UPLOADS/$file"
      psql "$DB" -q -c "update \"Tour\" set media = to_jsonb((json_build_array(json_build_object('"'"'type'"'"','"'"'image'"'"','"'"'url'"'"','"'"'$BASE/$file'"'"','"'"'alt'"'"', name)))::text) where id = '"'"'$id'"'"';"
      echo "  copied  $name"
    else
      echo "  FAILED  $name — the source did not return an image"
    fi
  done
'
