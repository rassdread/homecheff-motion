# Remaining blockers

1. The photo wizard file input was not the control that uploaded the kitchen image. The real upload route was called with the session, and the file is stored and owner-scoped. A wizard selection that returns that still onto scene 2 was not completed. Paid generation was not run.
2. Voice, music, and sound were attached with the timeline’s own file inputs. The voice creation form was opened, and the captured page text was still the workspace shell (“Loading workspace…”), not a completed narration form. The server quote that was executed is user C’s quote, which correctly refused a free account.
3. Browser preview proved that an 8-second clip reached `readyState` 4 and that seek moved the clock to 4000 ms. It did not play the full 32-second mix with audible music. The video element is muted by design.
4. The first export click produced no download while picture clips overlapped. The product rejects that overlap. After the timeline UI removed the overlap, Export MP4 downloaded a playable file.
5. User B’s browser gets HTTP 200 for the project URL because the shell renders, then does not show the film. The APIs return 404.
6. User C’s confirm button was visible and did not open a project within 20 seconds. The quote used a project created by `POST /api/studio/films` with that same session.
7. The disposable database started empty, so there was no historical image or animation project to reopen. The new film and its storyboard do reopen.
8. Repository database tests that are not in `npm test` refuse every database except `homecheff_film_cert_2u`. They were not pointed at this database.
9. Nothing was pushed, merged, or deployed. Paid providers were not called. HC spent is 0.

A local pass would not authorize production or preview deployment.
