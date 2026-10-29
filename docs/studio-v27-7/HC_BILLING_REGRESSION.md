# HC billing regression

No price was changed. No provider was called. No Stripe call was made. No real wallet was spent.

On `c722b35b`:

- Film jobs are created with `creditCost` 0, `creditsReserved` 0, `creditsCharged` 0, and `chargeFinalized` true.
- The worker returns `billing` and does not render when either credit field is non-zero.
- A repeat encode is skipped when the library asset already exists, so a retry does not create a second capture. There is no capture on this action.
- Motion create still calls `requireStudioCredits` for `motion_render`. That file was not in the worker diff.
- Scene image 30 HC and voice 15 HC remain the registry behavior certified in V27.3.3 and re-run under Node 24 in V27.5. They were not edited here.

V27.6 local worker test: wallet stayed 500, lifetime spent 0, one empty-timeline failure did not charge. That result is on the same application commit. It was not repeated.

The local mock gate is unchanged and is absent from the worker.
