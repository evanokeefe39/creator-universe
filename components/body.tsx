"use client";

import { forwardRef } from "react";
import * as THREE from "three";
import type { Tier } from "@/lib/types";
import { geometryFor } from "@/lib/geometry";
export type BodyProps = {
  id: string;
  tier: Tier;
  position: [number, number, number];
  radius: number;
  color: string;
  /** 0..1 engagement glow. Engagement never affects SIZE — see lib/gravity. */
  glow: number;
  selected: boolean;
  onSelect: (id: string) => void;
};

/**
 * One celestial body: flat-shaded low-poly geometry whose face count comes
 * from TIER_FACES via lib/geometry. Per-frame scale is driven by the parent
 * Bodies component (single render loop), so this component never re-renders
 * from zooming — only from selection.
 */
export const Body = forwardRef<THREE.Mesh, BodyProps>(function Body(
  { id, tier, position, radius, color, glow, selected, onSelect },
  ref,
) {
  return (
    <mesh
      ref={ref}
      geometry={geometryFor(tier)}
      position={position}
      scale={radius}
      userData={{ nodeId: id }}
      onPointerDown={(e) => {
        e.stopPropagation();
        onSelect(id);
      }}
    >
      <meshLambertMaterial
        flatShading
        color={selected ? "#4fb3c9" : color}
        emissive={selected ? "#4fb3c9" : color}
        emissiveIntensity={glow * 0.6}
      />
    </mesh>
  );
});