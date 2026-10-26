/**
 * Preparation only. Does not call Vidu or any other provider.
 * The current video adapter accepts a start image and an end image.
 * It does not accept a character master, a location master, and a
 * previous clip in one request.
 */

export type ContinuityPreparation = {
  providerCall: false;
  previousVideo: boolean;
  characterMaster: boolean;
  locationReference: boolean;
  limitation: string;
};

export function prepareShotContinuity(input: {
  previousVideoPath: string | null;
  characterMasterUrl: string | null;
  locationReferenceUrl: string | null;
}): ContinuityPreparation {
  return {
    providerCall: false,
    previousVideo: Boolean(input.previousVideoPath?.trim()),
    characterMaster: Boolean(input.characterMasterUrl?.trim()),
    locationReference: Boolean(input.locationReferenceUrl?.trim()),
    limitation:
      "Vidu image-to-video takes a start frame and an end frame. It does not take the character master and the location master in the same request. Extract the last frame locally, then submit it only after a separate approved generation.",
  };
}
