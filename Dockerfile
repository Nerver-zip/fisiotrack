# syntax=docker/dockerfile:1.7

ARG UBUNTU_IMAGE=ubuntu:24.04@sha256:33ceb71981b602c1a7443a53469e4dba065f7503eab3078a2d7a57a2ab987517
ARG NODE_IMAGE=node:24-bookworm-slim@sha256:ba849c60be29959425b8734d57b8b4b7d56f98edd9504c9af091d5281095a71e

FROM ${NODE_IMAGE} AS frontend-build
WORKDIR /src/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci
COPY frontend/ ./
RUN REACT_APP_API_URL="" npm run build

FROM ${UBUNTU_IMAGE} AS backend-build
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update \
    && apt-get install --yes --no-install-recommends \
        build-essential \
        ca-certificates \
        cmake \
        libsqlcipher-dev \
        libssl-dev \
        pkg-config \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /src
COPY backend/ ./backend/
RUN cmake \
        -S backend \
        -B /build \
        -DBUILD_TESTING=OFF \
        -DCMAKE_BUILD_TYPE=Release \
        -DFISIOTRACK_NATIVE_OPTIMIZATIONS=OFF \
    && cmake --build /build --target fisio_track_server --parallel

FROM ${UBUNTU_IMAGE} AS runtime
ENV DEBIAN_FRONTEND=noninteractive \
    FISIOTRACK_ROOT=/app \
    DB_TYPE=real \
    DB_REAL_PATH=/app/database/patients.db \
    API_HOST=0.0.0.0 \
    API_PORT=8080 \
    GDRIVE_PYTHON=/app/.venv/bin/python3 \
    GOOGLE_OAUTH_CLIENT_SECRETS=/run/secrets/google_oauth_client.json \
    OAUTH_REDIRECT_URI=http://127.0.0.1:8080/oauth-callback \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

RUN apt-get update \
    && apt-get install --yes --no-install-recommends \
        ca-certificates \
        curl \
        libsqlcipher1 \
        python3 \
        python3-venv \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --gid 10001 fisiotrack \
    && useradd --uid 10001 --gid 10001 --home-dir /app --shell /usr/sbin/nologin fisiotrack \
    && install -d -o fisiotrack -g fisiotrack \
        /app/bin \
        /app/config \
        /app/database \
        /app/frontend/build \
        /app/scripts \
        /run/secrets

COPY requirements.lock /tmp/requirements.lock
RUN python3 -m venv /app/.venv \
    && /app/.venv/bin/pip install --no-cache-dir --requirement /tmp/requirements.lock \
    && rm /tmp/requirements.lock \
    && chown -R fisiotrack:fisiotrack /app/.venv

COPY --from=backend-build --chown=fisiotrack:fisiotrack /build/fisio_track_server /app/bin/fisio_track_server
COPY --from=frontend-build --chown=fisiotrack:fisiotrack /src/frontend/build/ /app/frontend/build/
COPY --chown=fisiotrack:fisiotrack scripts/gdrive_upload.py /app/scripts/gdrive_upload.py

WORKDIR /app
USER 10001:10001
EXPOSE 8080
STOPSIGNAL SIGTERM
HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=6 \
    CMD curl --fail --silent http://127.0.0.1:8080/api/auth/status >/dev/null || exit 1
ENTRYPOINT ["/app/bin/fisio_track_server"]
