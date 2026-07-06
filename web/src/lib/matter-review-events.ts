/** Cross-panel refresh when Command panel completes an agent run on a matter. */
export const MATTER_REVIEW_REFRESH_EVENT = "aod:matter-review-refresh";

export function emitMatterReviewRefresh(matterId: string): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(MATTER_REVIEW_REFRESH_EVENT, { detail: { matterId } }),
  );
}
