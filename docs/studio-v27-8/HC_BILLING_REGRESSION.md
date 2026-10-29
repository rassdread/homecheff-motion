# HC billing

Film export remains 0 HC. `startTimelineExportJob` sets `creditCost`, `creditsReserved`, and `creditsCharged` to 0 and `chargeFinalized` true. The route does not call `billProviderAction` or `requireStudioCredits`.

The worker rejects a job whose `creditCost` or `creditsCharged` is not 0. A synthetic job with `creditCost` 30 returned HTTP 422 and did not encode.

Scene image price and voice price were not edited. Motion create still uses the existing `motion_render` charge. No price constant was changed.

Disposable wallets used by the duration test and the browser test stayed at 500, with `lifetimeSpent` 0. Real HC spent: 0. Paid provider calls: 0. Stripe operations: 0.
