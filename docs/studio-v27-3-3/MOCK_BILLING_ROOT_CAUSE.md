# Mock billing root cause

The mock provider did run. The credit gate did not look at it.

## Path

1. The browser certification POSTs `{ confirmed: true }` to `/api/studio/storyboards/[id]/scenes/[sceneId]/images`.
2. `POST` in `src/app/api/studio/storyboards/[id]/scenes/[sceneId]/images/route.ts` always called `billProviderAction` with `actionType: "scene_generation"`.
3. `billProviderAction` in `src/server/studio-account/bill-provider-action.ts` calls `authorizeStudioAction` before `execute`.
4. The price comes from `STUDIO_ACTION_COST_REGISTRY.scene_generation` in `src/server/studio-account/studio-action-cost-registry.ts`. That entry is provider `openai`, reserved cost `0.06` USD. `usdToCredits` uses margin `2.5` and `0.005` USD per credit: `ceil(0.06 * 2.5 / 0.005) = 30`.
5. `defaultProviderCostSpec` in `src/server/studio-account/studio-action-cost-mapping.ts` also labels `scene_generation` as provider `openai`.
6. `captureStudioActionReservation` writes `usage_capture` with that provider and a `-30` delta.
7. `execute` calls `generateStudioSceneImage`. Provider selection is `getSelectedSceneImageProviderId()` in `src/server/scene-image-providers/index.ts`, which returns `mock` when `STUDIO_SCENE_IMAGE_PROVIDER=mock`.
8. The completed `StudioSceneImage` row stores `result.provider`, which is `mock`.
9. `meterOpenAiSceneImage` in `src/server/provider-cost/studio-cost-metering.ts` returns immediately when `providerId` is not `openai`. It did not write the 60 HC debit.

`provider = mock` was not overwritten on the image. The ledger provider is the action-registry identity, chosen before the mock provider runs. A reservation of 30 is created even though the reservation row's own `creditsDelta` is 0. Capture then spends the 30.

The request body is not the source. The certification body is only `{ confirmed: true }`. The server environment selected the mock image provider, and the billing gate ignored that selection.

## Repair

`isAuthorizedLocalMockSceneImageExecution` decides the exception from server environment and the request Host header. The image route calls `generateStudioSceneImage` directly only when that function returns true, with `creditsCharged: 0`. It does not call `billProviderAction` on that path, so there is no reservation, capture, refund, or wallet mutation.

Every other request still uses `billProviderAction` and the existing 30 HC OpenAI price. The registry was not changed.
