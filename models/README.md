# Local vision model weights (not committed — run setup script)

Download with:

```bash
npm install
npm run setup:vision-models                              # MediaPipe only (Apache 2.0)
npm run setup:vision-models -- --include-object-detector # + RT-DETR ONNX (Apache 2.0)
npm run setup:vision-models -- --include-object-detector --kind=mobilenet-ssd
```

Expected layout:

```
models/mediapipe/
  blaze_face_short_range.tflite
  pose_landmarker_lite.task
  hand_landmarker.task

models/object-detector/
  model.json
  rtdetr.onnx              # default (--kind=rtdetr)
  # or ssd_mobilenet_v1_12.onnx  (--kind=mobilenet-ssd)
```

Environment overrides:

- `HC_MEDIAPIPE_MODEL_DIR` — custom MediaPipe model directory
- `HC_OBJECT_DETECTOR_MODEL_PATH` — custom object detector ONNX file path
- `HC_OBJECT_DETECTOR_MODEL_DIR` — custom object detector directory
- `HC_OBJECT_DETECTOR_KIND` — `rtdetr` | `mobilenet-ssd` | `custom-onnx`

Enable at runtime:

```
HC_ENABLE_MEDIAPIPE_SAFE_ZONES=1
HC_ENABLE_OBJECT_SAFE_ZONES=1
HC_OBJECT_DETECTOR_KIND=rtdetr
HC_SAFE_ZONE_DEBUG=1
```

Verify:

```bash
npm run test:vision-smoke
```

## Notes

- **MediaPipe models** auto-download from Google CDN via `npm run setup:vision-models` (Apache 2.0).
- **Object detector** uses permissive ONNX models only (Apache 2.0). YOLO/Ultralytics is intentionally **not** used due to AGPL/commercial licensing concerns.
- **Default model**: RT-DETR r50vd (PaddleDetection, Apache 2.0) via community ONNX export.
- **Fallback model**: SSD MobileNet v1 from ONNX Model Zoo (Apache 2.0).
- **Object detector/ONNX** runs fully in Node.js on the video worker when packages + model are present.
- **MediaPipe `@mediapipe/tasks-vision`** installs and models are validated, but Google's Tasks Vision API targets browsers; Node.js initialization currently fails open to Safe Zone V1. Admin diagnostics show `RUNTIME_UNSUPPORTED` when probed.
- Optional native helpers: `@napi-rs/canvas` (MediaPipe DOM shims), `onnxruntime-node`, `sharp`.
- Deprecated env vars (warn only, no effect): `HC_ENABLE_YOLO_SAFE_ZONES`, `HC_YOLO_MODEL_PATH`.

## License verification

| Model | Source | License |
|-------|--------|---------|
| RT-DETR r50vd | PaddleDetection RT-DETR | Apache-2.0 |
| SSD MobileNet v1 | ONNX Model Zoo | Apache-2.0 |
| MediaPipe tasks | Google MediaPipe | Apache-2.0 |

Non-permissive licenses (AGPL, GPL, non-commercial) are blocked at runtime and in admin diagnostics.
