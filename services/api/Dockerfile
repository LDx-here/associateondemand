FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    AOD_CONSTITUTION_DIR=/app/docs/constitution \
    AOD_BRAIN_ROOT=/app/brain

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    curl \
    poppler-utils \
    tesseract-ocr \
 && rm -rf /var/lib/apt/lists/*

COPY services/api/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY services/api/app ./app
COPY services/api/alembic ./alembic
COPY services/api/alembic.ini .
COPY docs/constitution ./docs/constitution
COPY data/dev-seed.json ./data/dev-seed.json
COPY data/templates ./data/templates

EXPOSE 8000

CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
