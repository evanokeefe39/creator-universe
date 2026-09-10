"use client";

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { Edge, Tier } from "@/lib/types";
import { GREYS } from "@/lib/palette";
import type { LightingSetup } from "@/lib/geometry";
import { Body } from "./body";
import {
  ZOOM_CLOSE_DISTANCE,
  ZOOM_FAR_DISTANCE,
  bodyScale,
  clusterLabelOpacity,
  edgeOpacity,
  nodeLabelOpacity,
  zoomT,
  LABEL_BUDGET,
  truncateHandle,
} from "@/lib/zoom";
import { LabelItem, liveProjections, setControls, updateSceneFrame } from "@/lib/scene-state";

export type VisibleNode = {
  id: string;
  tier: Tier;
  radius: number;
  color: string;
  priority: number;
};

export type ClusterLabel = {
  key: string;
  label: string;
  count: number;
  center: [number, number, number];
};

export type SceneProps = {
  visibleNodes: VisibleNode[];
  edges: Edge[];
  positions: Map<string, [number, number, number]>;
  clusters: ClusterLabel[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  lighting: LightingSetup;
};

/**
 * The whole 3D scene. A single useFrame drives every zoom-dependent property:
 * body scale, edge fade, the label budget, and fps — continuous lerps, no
 * hard breakpoints (Spike 4). React re-renders only on selection and filters.
 */
export function Scene({ visibleNodes, edges, positions, clusters, selectedId, onSelect, lighting }: SceneProps) {
  const meshRefs = useRef(new Map<string, THREE.Mesh>());
  const edgesMaterialRef = useRef<THREE.LineBasicMaterial>(null);
  const fpsRef = useRef(60);
  const controlsTargetRef = useRef<THREE.Vector3>(new THREE.Vector3());

  const camera = useThree((s) => s.camera);

  const indexed = useMemo(() => {
    const m = new Map<string, VisibleNode & { position: [number, number, number] }>();
    for (const v of visibleNodes) {
      const p = positions.get(v.id) ?? [0, 0, 0];
      m.set(v.id, { ...v, position: p });
    }
    return m;
  }, [visibleNodes, positions]);

  const edgeGeometry = useMemo(() => {
    const verts: number[] = [];
    for (const e of edges) {
      const a = positions.get(e.source);
      const b = positions.get(e.target);
      if (!a || !b) continue;
      verts.push(a[0], a[1], a[2], b[0], b[1], b[2]);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
    return geo;
  }, [edges, positions]);

  const clusterCenters = useMemo(
    () => clusters.map((c) => ({ key: c.key, label: c.label, count: c.count, v: new THREE.Vector3(...c.center) })),
    [clusters],
  );

  useFrame(({ size }, delta) => {
    const dist = camera.position.distanceTo(controlsTargetRef.current);
    const t = zoomT(dist);

    // Body scale collapse — one imperative loop per frame, no React state.
    const s = Math.max(0.018, bodyScale(t));
    for (const [id, mesh] of meshRefs.current) {
      const node = indexed.get(id);
      if (!node) {
        meshRefs.current.delete(id);
        continue;
      }
      mesh.scale.setScalar(node.radius * s);
    }

    // Labels: project, rank by priority, enforce the hard budget of 30.
    const nodeOpacity = nodeLabelOpacity(t);
    const clusterOpacity = clusterLabelOpacity(t);
    const labels: LabelItem[] = [];
    liveProjections.clear();

    if (nodeOpacity > 0.02) {
      const projected = new THREE.Vector3();
      const candidates: { id: string; text: string; x: number; y: number; p: number; accent: boolean }[] = [];
      for (const [id, node] of indexed) {
        projected.set(node.position[0], node.position[1], node.position[2]).project(camera);
        if (projected.z > 1) continue;
        const px = ((projected.x + 1) / 2) * size.width;
        const py = ((-projected.y + 1) / 2) * size.height;
        liveProjections.set(id, { x: px, y: py });
        const accent = id === selectedId;
        candidates.push({ id, text: truncateHandle(id), x: px, y: py, p: accent ? Infinity : node.priority, accent });
      }
      candidates.sort((a, b) => b.p - a.p);
      for (const c of candidates) {
        if (labels.length >= LABEL_BUDGET) break;
        labels.push({
          id: c.id,
          text: c.text,
          x: c.x,
          y: c.y,
          opacity: nodeOpacity * (c.accent ? 1 : 0.8),
          kind: "node",
          accent: c.accent,
        });
      }
    }

    if (clusterOpacity > 0.02) {
      const projected = new THREE.Vector3();
      for (const c of clusterCenters) {
        if (labels.length >= LABEL_BUDGET) break;
        projected.copy(c.v).project(camera);
        if (projected.z > 1) continue;
        labels.push({
          id: c.key,
          text: c.label.toUpperCase(),
          x: ((projected.x + 1) / 2) * size.width,
          y: ((-projected.y + 1) / 2) * size.height,
          opacity: clusterOpacity,
          kind: "cluster",
          accent: false,
        });
      }
    }

    if (edgesMaterialRef.current) edgesMaterialRef.current.opacity = edgeOpacity(t) * 0.6;

    fpsRef.current = fpsRef.current * 0.9 + (1 / Math.max(delta, 1e-4)) * 0.1;

    updateSceneFrame({
      zoomT: t,
      fps: fpsRef.current,
      labelCount: labels.length,
      labels,
      cameraDistance: dist,
    });
  });

  return (
    <>
      <SceneLights lighting={lighting} />
      <lineSegments geometry={edgeGeometry} frustumCulled={false}>
        <lineBasicMaterial ref={edgesMaterialRef} color={GREYS.edge} transparent opacity={0.5} depthWrite={false} />
      </lineSegments>
      {visibleNodes.map((v) => {
        const p = positions.get(v.id);
        if (!p) return null;
        return (
          <Body
            key={v.id}
            ref={(m) => {
              if (m) meshRefs.current.set(v.id, m);
            }}
            id={v.id}
            tier={v.tier}
            position={p}
            radius={v.radius}
            color={v.color}
            selected={selectedId === v.id}
            onSelect={onSelect}
          />
        );
      })}
      <OrbitControls
        makeDefault
        enablePan
        enableDamping
        dampingFactor={0.12}
        minDistance={ZOOM_CLOSE_DISTANCE * 0.4}
        maxDistance={ZOOM_FAR_DISTANCE * 1.4}
        ref={(c) => {
          if (!c) return;
          controlsTargetRef.current = c.target;
          setControls(c);
        }}
      />
    </>
  );
}

function SceneLights({ lighting }: { lighting: LightingSetup }) {
  if (lighting === "directional-only") {
    return <directionalLight position={[140, 200, 90]} intensity={2.4} />;
  }
  return (
    <>
      <ambientLight intensity={0.55} />
      <directionalLight position={[140, 200, 90]} intensity={1.5} />
    </>
  );
}