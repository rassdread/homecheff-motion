# Preview readiness

No preview was deployed. No production system was changed.

The original HTTPS browser certification completed on `https://127.0.0.1:3456` against `homecheff_film_cert_2u`. Port 3462 stayed up. Typecheck, lint, the unit suite, and the production build are in `REGRESSION_REPORT.md`.

The candidate checklist also requires no HC spending. The passing browser run debited 60 credits on the synthetic user it created. Two mock scene images were stored as provider `mock` and ledgered as `openai` `usage_capture` of 30 each. Video and dialogue in that run reported zero credits. The preserved local wallets were not debited, and no paid provider was called.

That debit is enough to withhold `LOCAL_CERTIFIED_PREVIEW_CANDIDATE`. Studio is not ready for a new isolated Preview until that mock-image charge is either accepted as the product rule or stopped, in a separate change. Do not deploy from this result.

Next required action: decide the mock scene-image credit rule, then rerun `studio-film-certification.browser.ts` on `https://127.0.0.1:3456` if the rule changes. Keep the server on port 3462. Do not widen login beyond the film-cert gate.
