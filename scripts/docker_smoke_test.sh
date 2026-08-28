#!/usr/bin/env bash

set -euo pipefail

IMAGE="${1:-fisiotrack:local}"
TEST_PORT="${FISIOTRACK_DOCKER_TEST_PORT:-18080}"
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RUN_ID="$$"
CONTAINER="fisiotrack-smoke-${RUN_ID}"
VOLUME="fisiotrack-smoke-data-${RUN_ID}"
PASSWORD="DockerTest1"

cleanup() {
    docker rm --force "$CONTAINER" >/dev/null 2>&1 || true
    docker volume rm "$VOLUME" >/dev/null 2>&1 || true
}
trap cleanup EXIT

if ss -ltn | grep -q ":${TEST_PORT} "; then
    echo "A porta de teste ${TEST_PORT} já está ocupada." >&2
    exit 1
fi

docker volume create "$VOLUME" >/dev/null

start_container() {
    docker run --detach \
        --name "$CONTAINER" \
        --read-only \
        --tmpfs /tmp:rw,noexec,nosuid,nodev,size=64m \
        --cap-drop ALL \
        --security-opt no-new-privileges \
        --pids-limit 128 \
        --publish "127.0.0.1:${TEST_PORT}:8080" \
        --mount "type=volume,source=${VOLUME},target=/app/database" \
        --mount "type=bind,source=${PROJECT_ROOT}/deploy/client_secrets.example.json,target=/run/secrets/google_oauth_client.json,readonly" \
        "$IMAGE" >/dev/null
}

wait_until_healthy() {
    for _ in $(seq 1 60); do
        status="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}missing{{end}}' "$CONTAINER")"
        if [[ "$status" == "healthy" ]]; then
            return 0
        fi
        if [[ "$(docker inspect --format '{{.State.Status}}' "$CONTAINER")" == "exited" ]]; then
            docker logs "$CONTAINER" >&2
            return 1
        fi
        sleep 1
    done
    docker logs "$CONTAINER" >&2
    echo "O container não ficou saudável dentro do prazo." >&2
    return 1
}

json_field() {
    local field="$1"
    python3 -c 'import json, sys; print(json.load(sys.stdin)[sys.argv[1]])' "$field"
}

start_container
wait_until_healthy

[[ "$(docker exec "$CONTAINER" id -u)" == "10001" ]]
if docker exec "$CONTAINER" sh -c 'touch /app/write-test' >/dev/null 2>&1; then
    echo "O filesystem principal deveria ser somente leitura." >&2
    exit 1
fi
docker exec "$CONTAINER" /app/.venv/bin/python3 -c 'import googleapiclient, google.auth' >/dev/null

initial_status="$(curl --fail --silent "http://127.0.0.1:${TEST_PORT}/api/auth/status")"
[[ "$(printf '%s' "$initial_status" | json_field initialized)" == "False" ]]

setup_response="$(curl --fail --silent \
    --header 'Content-Type: application/json' \
    --data "{\"password\":\"${PASSWORD}\"}" \
    "http://127.0.0.1:${TEST_PORT}/api/auth/setup")"
token="$(printf '%s' "$setup_response" | json_field token)"

curl --fail --silent \
    --header "Authorization: Bearer ${token}" \
    --header 'Content-Type: application/json' \
    --data '{"name":"Paciente Docker","phone":["0000"]}' \
    "http://127.0.0.1:${TEST_PORT}/api/patients" >/dev/null

oauth_response="$(curl --fail --silent \
    --header "Authorization: Bearer ${token}" \
    "http://127.0.0.1:${TEST_PORT}/api/backup/auth/url")"
printf '%s' "$oauth_response" | json_field url | grep -q 'accounts.google.com'

curl --fail --silent \
    --request POST \
    --header "Authorization: Bearer ${token}" \
    "http://127.0.0.1:${TEST_PORT}/api/backup" >/dev/null
docker exec "$CONTAINER" sh -c 'find /app/database/backups -type f -name "backup_dia_*.db" -size +0c | grep -q .'

docker stop --time 30 "$CONTAINER" >/dev/null
docker logs "$CONTAINER" 2>&1 | grep -q 'Encerrando FisioTrack com segurança'
docker rm "$CONTAINER" >/dev/null

start_container
wait_until_healthy

persisted_status="$(curl --fail --silent "http://127.0.0.1:${TEST_PORT}/api/auth/status")"
[[ "$(printf '%s' "$persisted_status" | json_field initialized)" == "True" ]]

login_response="$(curl --fail --silent \
    --header 'Content-Type: application/json' \
    --data "{\"password\":\"${PASSWORD}\"}" \
    "http://127.0.0.1:${TEST_PORT}/api/login")"
token="$(printf '%s' "$login_response" | json_field token)"
patients="$(curl --fail --silent \
    --header "Authorization: Bearer ${token}" \
    "http://127.0.0.1:${TEST_PORT}/api/patients")"
printf '%s' "$patients" | grep -q 'Paciente Docker'

echo "Smoke test Docker aprovado: saúde, isolamento, OAuth, backup e persistência."
