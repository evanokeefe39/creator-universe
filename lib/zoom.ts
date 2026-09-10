/**
 * Continuous zoom semantics (Spike 4). One scalar — normalized camera
 * distance `t` in [0, 1] — drives every zoom-dependent visual property. No
 * hard breakpoints: everything is a lerp/fade over overlapping bands.
 */

export const ZOOM_CLOSE_DISTANCE = 45;
export const ZOOM_FAR_DISTANCE = 620;

/** Normalized zoom t∈[0,1]: 0 = close (system), 1 = far (map). */
export function zoomT(cameraDistance: number): number {
  const t = (cameraDistance - ZOOM_CLOSE_DISTANCE) / (ZOOM_FAR_DISTANCE - ZOOM_CLOSE_DISTANCE);
  return Math.min(1, Math.max(0, t));
}

export type ZoomLevelName = "system" | "cluster" | "map";

/** Continuous display level — nearest semantic name, but the value is a scalar. */
export function zoomLevelName(t: number): ZoomLevelName {
  if (t < 1 / 3) return "system";
  if (t < 2 / 3) return "cluster";
  return "map";
}

/**
 * Body scale multiplier over zoom. Full faceted geometry at t=0, collapsing
 * smoothly toward dot-size by t≈0.55, dots thereafter. No hard step.
 */
export function bodyScale(t: number): number {
  const k = Math.min(1, Math.max(0, (t - 0.15) / 0.4));
  return 1 - k * 0.94;
}

/** Node-handle label opacity band: fades out across t∈[0.5, 0.68]. */
export function nodeLabelOpacity(t: number): number {
  if (t <= 0.5) return 1;
  if (t >= 0.68) return 0;
  return 1 - (t - 0.5) / 0.18;
}

/** Cluster/region label opacity band: fades in across t∈[0.55, 0.75]. */
export function clusterLabelOpacity(t: number): number {
  if (t <= 0.55) return 0;
  if (t >= 0.75) return 1;
  return (t - 0.55) / 0.2;
}

/** Edge line opacity: visible up close, gone by the cluster level. */
export function edgeOpacity(t: number): number {
  return Math.max(0, 1 - t / 0.45);
}

export const LABEL_BUDGET = 30;

/** Long handles are truncated for display, never for data. */
export function truncateHandle(handle: string, max = 18): string {
  return handle.length > max ? handle.slice(0, max - 1) + "…" : handle;
}