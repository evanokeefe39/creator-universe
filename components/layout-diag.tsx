"use client";

import { useMemo, useState } from "react";
import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import { generateSyntheticUniverse } from "@/lib/synthetic";
import { simulate, type LayoutParams } from "@/lib/layout";
import { GREYS } from "@/lib/palette";

/**
 * Spike 2 diagnostic: the force layout rendered with ONE flat colour and no
 * labels, with measured convergence and a chargeStrength sweep side by side.
 */
export function LayoutDiag() {
  const [params, setParams] = useState({
    a: { chargeStrength: -30, linkDistance: 24, centerStrength: 0.06 },
    b: { chargeStrength: -140, linkDistance: 24, centerStrength: 0.06 },
  });

  const universe = useMemo(() => generateSyntheticUniverse(), []);

  const results = useMemo(() => {
    const run = (p: LayoutParams) => simulate(universe.nodes, universe.edges, p);
    return { a: run(params.a), b: run(params.b) };
  }, [universe, params]);

  return (
    <main className="h-full w-full p-4" style={{ background: GREYS.bg }}>
      <header className="mb-3 flex flex-wrap items-center gap-4">
        <h1 className="font-mono text-[14px]" style={{ color: GREYS.textPrimary }}>
          Spike 2 — force layout diagnostics
        </h1>
        <div className="flex items-center gap-2 font-mono text-[11px]" style={{ color: GREYS.textSecondary }}>
          <label>
            A charge
            <input
              type="range"
              min={-150}
              max={-10}
              value={params.a.chargeStrength}
              onChange={(e) => setParams((p) => ({ ...p, a: { ...p.a, chargeStrength: Number(e.target.value) } }))}
              className="mx-2 w-36"
            />
            {params.a.chargeStrength}
          </label>
          <label>
            B charge
            <input
              type="range"
              min={-150}
              max={-10}
              value={params.b.chargeStrength}
              onChange={(e) => setParams((p) => ({ ...p, b: { ...p.b, chargeStrength: Number(e.target.value) } }))}
              className="mx-2 w-36"
            />
            {params.b.chargeStrength}
          </label>
        </div>
      </header>
      <div className="grid h-[calc(100%-64px)] grid-cols-1 gap-3 md:grid-cols-2">
        {(["a", "b"] as const).map((key) => {
          const r = results[key];
          return (
            <section key={key} className="relative overflow-hidden rounded-sm border" style={{ borderColor: GREYS.hairline }}>
              <Canvas camera={{ position: [0, 80, 260], fov: 55 }} dpr={[1, 2]}>
                <ColorBlindScene positions={r.positions} />
                <FlatSceneControls />
              </Canvas>
              <div
                className="pointer-events-none absolute top-2 left-2 rounded-sm border px-2 py-1 font-mono text-[10px]"
                style={{ borderColor: GREYS.hairline, background: GREYS.panel, color: GREYS.textSecondary }}
              >
                <div style={{ color: GREYS.textPrimary }}>
                  {key.toUpperCase()}: charge {r.params.chargeStrength}
                </div>
                <div>nodes {universe.nodes.length} · edges {universe.edges.length}</div>
                <div>
                  converged in <span style={{ color: GREYS.textPrimary }}>{r.convergenceMs.toFixed(0)} ms</span> ({r.ticks} ticks)
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}

function ColorBlindScene({ positions }: { positions: Map<string, [number, number, number]> }) {
  const geo = useMemo(() => {
    const arr: number[] = [];
    for (const [x, y, z] of positions.values()) arr.push(x, y, z);
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(arr, 3));
    return g;
  }, [positions]);
  return (
    <points geometry={geo}>
      <pointsMaterial color="#8a8580" size={2.4} sizeAttenuation={false} />
    </points>
  );
}

function FlatSceneControls() {
  return <OrbitControls enableDamping={false} />;
}
