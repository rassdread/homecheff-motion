# Character and media roundtrip

Character `V272 Guide` (`cmvrdb5f6000gdhrztiq3yugk`) belongs to user A. The Film Workspace button `studio-v272-browse-characters` loads `GET /api/studio/characters`. `studio-v272-attach-{id}` posts `{ characterId }` to the existing film-character route. That route calls `attachOwnedCharacterToFilm`, which checks ownership and upserts one library asset (`sourceKind: studio_character_link`, `sourceId: {projectId}:{characterId}`). The browser recorded `characterAttached: true`.

Empty `referenceImageUrl` values are no longer rendered as `<img src="">`. That empty source was reloading the document during certification.

Scene 2 links preserve project, scene, idea, and return path. A paid wizard was not run, so no generated still was returned onto the scene. Usable pictures on the film are the local timeline uploads described in the timeline report. Existing media can be placed from those timeline file inputs. A library-browser selection that returns onto scene 2 was not completed.
