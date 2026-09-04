FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY requirement.txt .
RUN pip install --no-cache-dir -r requirement.txt

# Copy source code
COPY . .

ENV PYTHONUNBUFFERED=1
ENV PYTHONIOENCODING=utf-8
ENV WIKI_SERVER_PORT=8002

EXPOSE 8002

CMD ["python", "server.py"]
