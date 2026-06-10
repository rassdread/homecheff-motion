# HomeCheff rembg segmentation service (CPU)
FROM python:3.11-slim-bookworm

RUN apt-get update \
  && apt-get install -y --no-install-recommends libgl1 libglib2.0-0 \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download u2net weights so cold starts are faster.
RUN python -c "from rembg import remove; from PIL import Image; remove(Image.new('RGB', (64, 64)))"

COPY app.py .

ENV PORT=8080
EXPOSE 8080

CMD ["sh", "-c", "uvicorn app:app --host 0.0.0.0 --port ${PORT:-8080}"]
