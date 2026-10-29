# Browser certification

VERIFIED against clean checkout `4880f88844e0b3f2a8dcef1bec36eee4c210f3ae` in `/Users/sergioarrias/HomeCheffProjects/homecheff-motion-v278-exact`.

- Origin: `https://127.0.0.1:3478`
- Local worker: `http://127.0.0.1:8097`, real FFmpeg, not the live Render service
- Database: `homecheff_film_cert_2u` on `127.0.0.1`
- Login used the existing `STUDIO_FILM_CERT_LOCAL_AUTH` gate

The user opened the film timeline, clicked Export MP4, and the browser received a real MP4 download. ffprobe reported H.264 and AAC, duration over 2.5 seconds. The film was one 3-second picture plus voice.

After visiting `/projects` and returning to the timeline, the download button was still there (`data-testid=film-export-download`) and a second download succeeded.

Another logged-in user received HTTP 404 for that job. An empty timeline showed the failure alert. The wallet stayed at 500. The page made no request to `homecheff.eu`, OpenAI, Stripe, or `onrender.com`.

Job id: `cmvsxjrlz0001dh9a9w70vmbv`.

This browser film is not the 60-second certification. That measurement is in `FILM_DURATION_TESTS.md`.
