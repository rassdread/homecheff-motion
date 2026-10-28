# Reference image upload

The signed-in browser context posted the synthetic kitchen image to the real route `POST /api/uploads/images`. No blob token was configured, so the route stored the file under `STUDIO_LOCAL_MEDIA_DIR`.

| Field | Value |
| --- | --- |
| HTTP status | 200 |
| Working URL | `/api/studio/local-media/67a7d26e-ba69-4736-a6c5-66a17e2efbec` |
| Owner GET | 200, 1856 bytes |
| Codec | mjpeg |
| Dimensions | 960 × 540 |
| MIME | `image/jpeg` |
| Owner | `cmvrdb5a20000dhrzji8993h1` (user A) |
| File name recorded | `kitchen.png` |
| User B GET | 404 |

The upload response built an absolute `http://localhost:3462` URL even though the browser was on `127.0.0.1:3462`. The stored key is the relative local-media path. User B cannot read the file. This does not prove delivery to Vidu. The provider was not called.

The file picker inside the photo wizard was not the control that selected the image. The session posted the multipart body to the same upload route the wizard uses.
