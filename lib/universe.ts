import type { Universe } from "./types";
import { generateSyntheticUniverse } from "./synthetic";

export type LoadedUniverse = {
  universe: Universe;
  /** True when /universe.json was missing and the synthetic generator ran. */
  isSynthetic: boolean;
  error: string | null;
};

/**
 * Fetch the canonical graph from /universe.json. When it 404s (collection not
 * run yet), fall back to the deterministic synthetic generator and FLAG it —
 * synthetic data is never presented as real.
 */
export async function loadUniverse(): Promise<LoadedUniverse> {
  try {
    const res = await fetch("/universe.json", { cache: "no-store" });
    if (res.ok) {
      const json = (await res.json()) as Universe;
      if (Array.isArray(json.nodes) && Array.isArray(json.edges)) {
        return { universe: json, isSynthetic: false, error: null };
      }
      return { universe: generateSyntheticUniverse(), isSynthetic: true, error: "universe.json malformed; showing synthetic data" };
    }
    if (res.status === 404) {
      return {
        universe: generateSyntheticUniverse(),
        isSynthetic: true,
        error: null,
      };
    }
    return { universe: generateSyntheticUniverse(), isSynthetic: true, error: `universe.json fetch failed (${res.status}); showing synthetic data` };
  } catch (e) {
    return { universe: generateSyntheticUniverse(), isSynthetic: true, error: `universe.json fetch failed (${String(e)}); showing synthetic data` };
  }
}