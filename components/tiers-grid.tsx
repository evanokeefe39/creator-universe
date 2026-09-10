"use client";

import { useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Html, OrbitControls } from "@react-three/drei";
import type { Tier } from "@/lib/types";
import { TIER_FACES, TIER_LABELS } from "@/lib/types";
import { geometryFor, geometrySpecFor, type LightingSetup } from "@/lib/geometry";
import { NICHE_COLORS, GREYS } from "@/lib/palette";

/**
 * Spike 3 diagnostic: all six tiers at three zoom levels under both lighting
 * setups. Every cell is one flat-shaded procedural body, nothing else.
 */
const ZOOMS = [
  { key: "close", distance: 4.6 },
  { key: "mid", distance: 8 },
  { key: "far", distance: 14 },
] as const;
const TIERS: Tier[] = [6, 5, 4, 3, 2, 1];
const SETUPS: LightingSetup[] = ["directional-only", "ambient-plus-directional"];

export function TiersGrid() {
  const [setup, setSetup] = useState<LightingSetup>("ambient-plus-directional");

  const specs = useMemo(
    () =>
      TIERS.map((t) => {
        geometryFor(t);
        return { tier: t, faces: TIER_FACES[t], ...geometrySpecFor(t) };
      }),
    [],
  );

  return (
    <main className="h-full w-full overflow-auto p-4" style={{ background: GREYS.bg }}>
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-mono text-[14px]" style={{ color: GREYS.textPrimary }}>
          Spike 3 — tiered geometry
        </h1>
        <div className="flex rounded-sm border" style={{ borderColor: GREYS.hairline }}>
          {SETUPS.map((s) => (
            <button
              key={s}
              onClick={() => {
                setSetup(s);
              }}
              className="px-3 py-1.5 font-mono text-[11px]"
              style={{
                background: setup === s ? "rgba(79,179,201,0.12)" : "transparent",
                color: setup === s ? "#4fb3c9" : GREYS.textSecondary,
              }}
            >
              {s === "directional-only" ? "Single directional" : "Ambient + directional"}
            </button>
          ))}
        </div>
      </header>

      {/* Achieved face counts — the measured numbers for the report. */}
      <div className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-6">
        {specs.map((s) => (
          <div key={s.tier} className="rounded-sm border p-2 font-mono text-[10px]" style={{ borderColor: GREYS.hairline, color: GREYS.textSecondary }}>
            <div style={{ color: GREYS.textPrimary }}>
              T{s.tier} {TIER_LABELS[s.tier]}
            </div>
            <div>
              requested {s.requestedFaces} → achieved <span style={{ color: GREYS.textPrimary }}>{s.achievedFaces}</span>
            </div>
            <div>
              {s.method}
              {s.detail !== null ? ` (detail ${s.detail})` : ""}
            </div>
          </div>
        ))}
      </div>

      {/* One canvas per lighting setup: a 6x3 lattice of bodies (tier rows x
          zoom columns). Chromium caps ~16 WebGL contexts per page, so 36
          per-cell canvases evict each other; 2 canvases render reliably. */}
      <section className="rounded-sm border" style={{ borderColor: GREYS.hairline }}>
        <div className="px-3 py-1.5 font-mono text-[11px]" style={{ color: GREYS.textSecondary }}>
          {setup === "directional-only" ? "Single directional" : "Ambient + directional"} · rows: tiers T6..T1 · columns: close / mid / far
        </div>
        <div style={{ height: 620 }}>
          <Canvas camera={{ position: [6, -13.5, 46], fov: 40 }} dpr={[1, 2]}>
            <TierLights setup={setup} />
            {TIERS.map((tier, ti) =>
              ZOOMS.map((z, zi) => (
                <group key={`${tier}-${z.key}`} position={[zi * 6, -ti * 5.4, 0]}>
                  <TierBody tier={tier} />
                  <Html center distanceFactor={22}>
                    <div className="label-chip" style={{ fontSize: 10, color: GREYS.textSecondary }}>
                      T{tier} · {z.key}
                    </div>
                  </Html>
                </group>
              )),
            )}
            <OrbitControls target={[6, -13.5, 0]} enableDamping={false} />
          </Canvas>
        </div>
      </section>
    </main>
  );
}

function TierLights({ setup }: { setup: LightingSetup }) {
  if (setup === "directional-only") {
    return <directionalLight position={[4, 6, 3]} intensity={3} />;
  }
  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[4, 6, 3]} intensity={2} />
    </>
  );
}

function TierBody({ tier }: { tier: Tier }) {
  const geometry = useMemo(() => geometryFor(tier), [tier]);
  return (
    <mesh geometry={geometry} scale={1.6}>
      <meshLambertMaterial flatShading color={NICHE_COLORS.slateBlue} />
    </mesh>
  );
}