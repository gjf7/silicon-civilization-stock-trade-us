FROM python:3.13-slim-bookworm AS build
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv
WORKDIR /app
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project

FROM python:3.13-slim-bookworm
WORKDIR /app
COPY --from=build /app/.venv /app/.venv
# main.py writes its SQLite cache next to itself, so that directory must be
# writable by the unprivileged user.
RUN useradd --uid 1000 --create-home app && mkdir -p /opt/scs && chown app:app /opt/scs
COPY --chown=app:app main.py /opt/scs/main.py
RUN chown app:app /app
ENV PATH="/app/.venv/bin:$PATH" PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
USER app
EXPOSE 8001
CMD ["uvicorn", "main:app", "--app-dir", "/opt/scs", "--host", "0.0.0.0", "--port", "8001"]
