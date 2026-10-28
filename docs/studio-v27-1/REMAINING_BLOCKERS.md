# Remaining blockers

1. No disposable database. `DATABASE_URL` is unset. Migrations were not run. Film projects, accounts, and export jobs were not written.

2. No authenticated browser session. Owner, second user, and zero-HC navigation were not clicked through the UI. The zero-HC denial is the credit policy unit result only.

3. Blob upload was not executed. `BLOB_READ_WRITE_TOKEN` is unset. The staged PNG reached the still-adapter picker, not `POST /api/uploads/images` and not Vidu.

4. Voice synthesis from the homepage does not call `generateStoryboardVoice` until a storyboard exists. That is the existing API. A storyboard was not created here.

5. Music and sound-effect generate buttons still call the existing billed routes. Those routes require server confirmation. They were not clicked, so a GenerationJob row was not created.

6. Product export download and preview `<video>` playback were not exercised. The local 30 second file was produced by `renderTimelineFilm` and checked with ffprobe.

7. The voice form was checked at all seven target widths with no horizontal overflow. Music was checked at 1280. Sound effects, film, timeline, editor, and photo-video were not remeasured at every width in this pass.

8. Protected environments were not contacted. No push, merge, or deploy.
