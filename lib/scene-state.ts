/**
 * Frame-rate data flows out of the r3f render loop (60 fps updates) into the
 * HTML overlay. React state would re-render the whole tree per frame, so this
 * is a mutable observable the overlay samples from at human rates.
 */
import { useSyncExternalStore } from "react";
import { LABEL_BUDGET, ZOOM_CLOSE_DISTANCE } from "./zoom";

export type LabelItem = {
  id: string;
  text: string;
  x: number;
  y: number;
  opacity: number;
  kind: "node" | "cluster";
  accent: boolean;
};

export type SceneFrame = {
  zoomT: number;
  fps: number;
  labelCount: number;
  labels: LabelItem[];
  cameraDistance: number;
};

const listeners = new Set<() => void>();
const frame: SceneFrame = {
  zoomT: 0,
  fps: 0,
  labelCount: 0,
  labels: [],
  cameraDistance: ZOOM_CLOSE_DISTANCE,
};
let snapshot: SceneFrame = { ...frame, labels: [] };
let lastNotify = 0;

const NOTIFY_INTERVAL_MS = 120;

export function updateSceneFrame(patch: Partial<SceneFrame>): void {
  Object.assign(frame, patch);
  const now = performance.now();
  if (now - lastNotify < NOTIFY_INTERVAL_MS) return;
  lastNotify = now;
  snapshot = { ...frame, labels: frame.labels };
  for (const l of listeners) l();
}

export function useSceneFrame(): SceneFrame {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => snapshot,
  );
}

export const MAX_LABELS = LABEL_BUDGET;

/** Node id -> last projected screen position, written every frame by the scene. */
export const liveProjections = new Map<string, { x: number; y: number }>();

/** Mutable side-channels the render loop writes and test hooks read. */
type Vec3Like = { x: number; y: number; z: number };
type ControlsLike = { reset: () => void; target: Vec3Like; object: { position: Vec3Like } };
let controlsRef: ControlsLike | null = null;
export function setControls(c: ControlsLike | null): void {
  controlsRef = c;
  (window as unknown as { __cuControls?: ControlsLike }).__cuControls = c ?? undefined;
}
export function resetView(): void {
  controlsRef?.reset();
}