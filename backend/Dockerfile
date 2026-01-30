FROM python:3.12-slim

# System deps for opencv, ffmpeg (pydub/yt-dlp), and psycopg2
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python deps (cached layer)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy app code
COPY . .

# Collect static files
RUN python manage.py collectstatic --noinput

# Create media directory
RUN mkdir -p /app/media

EXPOSE 8000

CMD gunicorn karyon.wsgi:application --bind 0.0.0.0:${PORT:-8000} --workers 2 --timeout 300
