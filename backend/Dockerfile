# ─────────────────────────────────────────────
# AURA Backend Dockerfile
# Multi-stage build for Python FastAPI service
# ─────────────────────────────────────────────

# ── Stage 1: Dependencies ───────────────────
FROM python:3.11-slim AS builder

WORKDIR /build

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy and install Python dependencies
COPY requirements.txt .
RUN pip install --upgrade pip && \
    pip install --prefix=/install --no-cache-dir -r requirements.txt

# ── Stage 2: Runtime ────────────────────────
FROM python:3.11-slim AS runtime

# Pin the CLI used by the Terraform plan endpoint; the server never runs apply.
COPY --from=hashicorp/terraform:1.16.6 /bin/terraform /usr/local/bin/terraform

WORKDIR /app

# Install runtime system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy installed packages from builder
COPY --from=builder /install /usr/local

# Copy application source code
COPY . .

# Create non-root user for security
RUN useradd -m -u 1001 aurauser && chown -R aurauser:aurauser /app
USER aurauser

# Expose FastAPI port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=5 \
    CMD curl -f http://localhost:8000/health || exit 1

# Start the FastAPI application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
