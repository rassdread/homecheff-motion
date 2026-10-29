# Worker image

`WORKER_IMAGE_CERTIFICATION = BLOCKED`

Checked on 2026-10-29 in this worktree:

- `docker`, `podman`, `colima`, and `nerdctl` are not on `PATH`
- No Docker, OrbStack, or Podman app is in `/Applications`
- `rassdread/homecheff-motion` has zero GitHub Actions workflows
- Free disk is 5.0 GiB at 98% capacity

`Dockerfile.worker` is unchanged from the live commit. It is `node:20-bookworm`, installs Debian `ffmpeg`, runs `npm ci`, `prisma generate`, copies the full tree, and starts `npm run worker`. A local Node process is not that image. V27.8's local worker results stay PREVIOUSLY_CERTIFIED and are not an image certification.

Building here would also need a large base image, `npm ci`, and the RT-DETR download. That is not safe on 5.0 GiB free.

Approved later build, from a machine with Docker and enough disk. Do not point it at production:

```bash
git checkout 4880f88844e0b3f2a8dcef1bec36eee4c210f3ae
docker build -f Dockerfile.worker -t homecheff-motion-worker:4880f888 .
docker run --rm -e VIDEO_WORKER_SECRET=local-only -e DATABASE_URL=postgresql://127.0.0.1:5432/disposable \
  -e BLOB_READ_WRITE_TOKEN= -p 8090:8090 homecheff-motion-worker:4880f888
```

Inside that container, read `GET /health`, then `ffmpeg -encoders` for `libx264` and `aac`. Do not load production secrets into the build.
