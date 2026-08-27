#!/bin/bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
BUILD_MODE="${1:-build}"

export ENVIRONMENT=lan
export API_HOST="${API_HOST:-0.0.0.0}"
export API_PORT="${API_PORT:-8080}"

if [[ "$BUILD_MODE" == "build" ]]; then
    echo "Compilando o frontend para servir no mesmo endereço da API..."
    (
        cd "$ROOT_DIR/frontend"
        REACT_APP_API_URL="" npm run build
    )

    echo "Compilando o servidor..."
    cmake -S "$ROOT_DIR/backend" -B "$ROOT_DIR/backend/build"
    cmake --build "$ROOT_DIR/backend/build" --target fisio_track_server -j"$(nproc)"
elif [[ "$BUILD_MODE" != "start" ]]; then
    echo "Uso: ./runlan.sh [build|start]" >&2
    exit 2
fi

if [[ ! -x "$ROOT_DIR/backend/build/fisio_track_server" ]]; then
    echo "Servidor não compilado. Execute ./runlan.sh build primeiro." >&2
    exit 1
fi

echo "FisioTrack iniciado para a rede local na porta $API_PORT."
echo "Acesse nos computadores da clínica: http://IP-DESTE-COMPUTADOR:$API_PORT"
cd "$ROOT_DIR"
exec "$ROOT_DIR/backend/build/fisio_track_server"
