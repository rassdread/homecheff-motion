# Worker image

BLOCKED.

`command -v docker` and `command -v podman` were empty on this machine. `Dockerfile.worker` still copies the whole repository and installs Debian FFmpeg. That image was not built.

The local certification ran `worker/video-worker.ts` under Node v24.22.2 with Homebrew FFmpeg. That is not the Docker image.

Do not treat the local process as image certification.
