# Multi-stage build for production-ready backend

# Stage 1: Base Python image with dependencies
FROM python:3.11-slim as base

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN useradd -m -u 1000 appuser

WORKDIR /app

# Stage 2: Dependencies installation
FROM base as dependencies

# Copy requirements file (build context is backend/ due to dockerfile_path)
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Stage 3: Development image (for docker-compose)
FROM dependencies as development

WORKDIR /app

# Install additional development dependencies
RUN pip install --no-cache-dir \
    pytest \
    pytest-asyncio \
    pytest-cov \
    black \
    flake8 \
    mypy

# Don't switch to non-root user in development for flexibility
# Development files will be mounted as volumes

EXPOSE 8000

# Run with uvicorn for hot-reload in development
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]

# Stage 4: Production image (MUST be last - App Platform builds last stage)
FROM base as production

# Copy installed dependencies from dependencies stage
COPY --from=dependencies /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=dependencies /usr/local/bin /usr/local/bin

# Copy application code (build context is backend/ due to dockerfile_path)
COPY --chown=appuser:appuser app /app/app
COPY --chown=appuser:appuser gunicorn.conf.py /app/

# Set PYTHONPATH so Python can find the app module
ENV PYTHONPATH=/app

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:8000/health')" || exit 1

# Run with gunicorn for production
CMD ["gunicorn", "-c", "gunicorn.conf.py", "app.main:app"]
