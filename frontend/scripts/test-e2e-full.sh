#!/bin/sh
set -eu

repo_root="$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)"
compose_file="$repo_root/docker-compose.e2e.yml"
project_name="${COMPOSE_PROJECT_NAME:-barberbook-e2e}"
frontend_port="${E2E_FRONTEND_PORT:-3300}"
backend_port="${E2E_BACKEND_PORT:-3301}"

export E2E_FRONTEND_PORT="$frontend_port"
export E2E_BACKEND_PORT="$backend_port"
export E2E_BASE_URL="http://127.0.0.1:$frontend_port"

if ! docker info >/dev/null 2>&1; then
  echo "Docker Engine is unavailable. Start Docker and retry the full-stack E2E." >&2
  exit 1
fi

compose() {
  docker compose -p "$project_name" -f "$compose_file" "$@"
}

cleanup() {
  exit_code=$?
  if [ "$exit_code" -ne 0 ]; then
    compose logs --no-color || true
  fi
  compose down --volumes --remove-orphans || true
  exit "$exit_code"
}
trap cleanup EXIT

compose down --volumes --remove-orphans
compose up --build --detach --wait --wait-timeout 240
npm run test:e2e:full:playwright
