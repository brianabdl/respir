# syntax=docker/dockerfile:1

# ---- Build the virtualenv (model weights are NOT baked in; see the ai-models compose job) ----
FROM python:3.12-slim-bookworm AS builder

COPY --from=ghcr.io/astral-sh/uv:0.12 /uv /usr/local/bin/uv

ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PYTHON_DOWNLOADS=never

WORKDIR /app

ARG UV_EXTRAS="--extra ml --extra vertex"
# The lockfile resolves CUDA torch plus several GB of nvidia libraries. For CPU-only hosts we
# install the same locked torch version from the CPU wheel index and skip the CUDA packages.
# Build with --build-arg TORCH_INDEX= (empty) to keep the lockfile's CUDA build instead.
ARG TORCH_INDEX="https://download.pytorch.org/whl/cpu"

COPY pyproject.toml uv.lock ./
RUN --mount=type=cache,target=/root/.cache/uv \
    if [ -n "$TORCH_INDEX" ]; then \
        uv export --frozen --no-dev --no-emit-project --no-hashes $UV_EXTRAS -o /tmp/requirements.txt \
        && grep -Ev '^(nvidia-|cuda-|triton|torch==)' /tmp/requirements.txt > /tmp/requirements-cpu.txt \
        && TORCH_PIN="$(grep -E '^torch==' /tmp/requirements.txt | sed 's/ *;.*//')" \
        && uv venv /app/.venv \
        && uv pip install --python /app/.venv/bin/python --no-deps -r /tmp/requirements-cpu.txt \
        && if [ -n "$TORCH_PIN" ]; then \
            uv pip install --python /app/.venv/bin/python --no-deps --index-url "$TORCH_INDEX" "$TORCH_PIN"; \
        fi; \
    else \
        uv sync --frozen --no-dev --no-install-project $UV_EXTRAS; \
    fi

# ---- Runtime ----
FROM python:3.12-slim-bookworm AS runtime

RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --system --uid 10001 --home-dir /app --shell /usr/sbin/nologin app \
    && mkdir /models \
    && chown app:app /models

WORKDIR /app

COPY --from=builder /app/.venv /app/.venv
COPY app ./app
COPY scripts ./scripts

# Install with ML extras to include all ML dependencies
RUN uv sync --frozen --extra ml

USER app

EXPOSE 9000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "9000"]
