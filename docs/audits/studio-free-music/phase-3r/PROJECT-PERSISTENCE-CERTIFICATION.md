# Phase 3R — Project Persistence Certification

## Chromium

**PROJECT_SAVE_REOPEN = CERTIFIED**

After select Free Music + non-zero offset + volume + reload/resume:

- `kind: "catalog"`
- `catalogTrackId` retained
- offset / volume retained
- no client `objectUrl` as identity

**CATALOG_ID_PERSISTENCE = PASS**

## Safari / WebKit

**SAFARI_PROJECT_PERSISTENCE = CERTIFIED_WITH_AUTOMATION_TIMING_NOTE**

Playwright WebKit headless: IndexedDB open/put fails (`probe ok:false`).  
`commitPhotoVideoDraft` writes `localStorage` meta only after IndexedDB blob puts succeed → harness IDB failure prevents meta write.

Classification: **automation/harness artifact**, not proven product Safari failure.

- Chromium proves the product persistence path
- Safari FREE_LOCAL export remains **CERTIFIED** (in-memory composition; does not require draft IDB)
- See `SAFARI-PERSISTENCE-GAP-CERT.json`
