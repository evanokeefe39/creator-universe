"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import type { Node, Tier, Universe } from "@/lib/types";
import { loadUniverse } from "@/lib/universe";
import {
  DEFAULT_PARAMS,
  graphHash,
  loadCachedLayout,
  saveCachedLayout,
  simulate,
  type LayoutResult,
  type LayoutParams,
} from "@/lib/layout";
import { bodyRadius, engagementGlow, labelPriority } from "@/lib/gravity";
import { colorForCluster, ACCENT, GREYS } from "@/lib/palette";
import { ZOOM_CLOSE_DISTANCE } from "@/lib/zoom";
import { liveProjections } from "@/lib/scene-state";
import { Scene, type ClusterLabel, type VisibleNode } from "./scene";
import { Labels } from "./labels";
import { Hud } from "./hud";
import { DetailPanel } from "./detail-panel";

type Loaded = { universe: Universe; isSynthetic: boolean; error: string | null };

declare global {
  interface Window {
    __cu?: {
      ready: boolean;
      isSynthetic: boolean;
      select: (id: string) => void;
      deselect: () => void;
      setTierVisible: (tier: Tier, visible: boolean) => void;
      hiddenTiers: () => number[];
      zoomTo: (distance: number) => void;
      camera: () => { position: [number, number, number]; distance: number };
      proj: () => Record<string, { x: number; y: number }>;
      projected: (id: string) => { x: number; y: number } | null;
      search: (q: string) => number;
      selected: () => string | null;
    };
  }
}

/**
 * App shell for `/`: canvas scene + HUD, single selection source (React
 * state here), layout computed once and cached to localStorage.
 */
export function UniverseApp() {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [layout, setLayout] = useState<LayoutResult | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hiddenTiers, setHiddenTiers] = useState<Set<number>>(() => new Set());
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    loadUniverse().then((loadedResult: Loaded) => {
      if (cancelled) return;
      const universe = loadedResult.universe;
      const hash = graphHash(universe.nodes, universe.edges);
      const cached = loadCachedLayout(hash);
      if (cached) {
        setLoaded(loadedResult);
        setLayout(cached);
      } else {
        const result = simulate(universe.nodes, universe.edges, DEFAULT_PARAMS);
        saveCachedLayout(hash, result);
        setLoaded(loadedResult);
        setLayout(result);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const nodesById = useMemo(() => {
    const m = new Map<string, Node>();
    for (const n of loaded?.universe.nodes ?? []) m.set(n.id, n);
    return m;
  }, [loaded]);

  const visibleNodes: VisibleNode[] = useMemo(() => {
    if (!loaded || !layout) return [];
    return loaded.universe.nodes
      .filter((n) => n.tier === null || !hiddenTiers.has(n.tier))
      .map((n) => ({
        id: n.id,
        tier: n.tier ?? 3, // unknown-tier nodes still render; radius handles size
        radius: bodyRadius(n),
        color: colorForCluster(n.cluster),
        priority: labelPriority(n),
        glow: engagementGlow(n),
      }));
  }, [loaded, layout, hiddenTiers]);

  const visibleEdges = useMemo(() => {
    if (!loaded) return [];
    const visible = new Set(visibleNodes.map((v) => v.id));
    return loaded.universe.edges.filter((e) => visible.has(e.source) && visible.has(e.target));
  }, [loaded, visibleNodes]);

  // Each label names the cluster's DOMINANT body — the member the layout hung
  // the centre on — and sits on that body, not on the cluster's mean position.
  // The mean would drift toward the ring of satellites and label empty space.
  const clusters: ClusterLabel[] = useMemo(() => {
    if (!loaded || !layout) return [];
    const groups = new Map<string, { count: number; heaviest: string; heaviestFollowers: number }>();
    for (const v of visibleNodes) {
      const n = nodesById.get(v.id);
      if (!n || n.cluster === null) continue;
      const followers = n.followers ?? -1;
      const g = groups.get(n.cluster);
      if (!g) groups.set(n.cluster, { count: 1, heaviest: n.id, heaviestFollowers: followers });
      else {
        g.count++;
        if (followers > g.heaviestFollowers) {
          g.heaviest = n.id;
          g.heaviestFollowers = followers;
        }
      }
    }
    const out: ClusterLabel[] = [];
    for (const [key, g] of groups) {
      if (g.count < 2) continue; // a cluster of exactly one member gets no phantom label
      out.push({
        key,
        label: `${g.heaviest} (${g.count})`,
        count: g.count,
        center: layout.positions.get(g.heaviest) ?? [0, 0, 0],
      });
    }
    return out;
  }, [loaded, visibleNodes, layout, nodesById]);


  const onSelect = useCallback((id: string | null) => {
    setSelectedId(id);
  }, []);

  const toggleTier = useCallback((tier: Tier) => {
    setHiddenTiers((prev) => {
      const next = new Set(prev);
      if (next.has(tier)) next.delete(tier);
      else next.add(tier);
      return next;
    });
  }, []);

  // Deterministic test/automation hooks. Rendering itself never depends on these.
  useEffect(() => {
    if (!loaded || !layout) return;
    const hooks = {
      ready: true,
      isSynthetic: loaded.isSynthetic,
      select: (id: string) => setSelectedId(nodesById.has(id) ? id : null),
      deselect: () => setSelectedId(null),
      setTierVisible: (tier: Tier, visible: boolean) => {
        setHiddenTiers((prev) => {
          const next = new Set(prev);
          if (visible) next.delete(tier);
          else next.add(tier);
          return next;
        });
      },
      hiddenTiers: () => [...hiddenTiers],
      zoomTo: (distance: number) => {
        const w = window as unknown as { __cuControls?: { object: { position: { x: number; y: number; z: number } }; target: { x: number; y: number; z: number } } };
        const c = w.__cuControls;
        if (!c) return;
        const dir = { x: c.object.position.x - c.target.x, y: c.object.position.y - c.target.y, z: c.object.position.z - c.target.z };
        const len = Math.hypot(dir.x, dir.y, dir.z) || 1;
        const k = distance / len;
        c.object.position.x = c.target.x + dir.x * k;
        c.object.position.y = c.target.y + dir.y * k;
        c.object.position.z = c.target.z + dir.z * k;
      },
      camera: () => {
        const c = (window as unknown as { __cuControls?: { object: { position: { x: number; y: number; z: number } }; target: { x: number; y: number; z: number } } }).__cuControls;
        if (!c) return { position: [0, 0, 0] as [number, number, number], distance: 0 };
        const p = c.object.position;
        return {
          position: [p.x, p.y, p.z] as [number, number, number],
          distance: Math.hypot(p.x - c.target.x, p.y - c.target.y, p.z - c.target.z),
        };
      },
      projected: (id: string) => liveProjections.get(id) ?? null,
      proj: () => Object.fromEntries(liveProjections),
      nodeCount: () => ({ visible: visibleNodes.length, total: loaded.universe.nodes.length }),
      search: (q: string) => {
        setSearch(q);
      },
      selected: () => selectedId,
    };
    (window as unknown as { __cu?: unknown }).__cu = hooks;
  }, [loaded, layout, nodesById, hiddenTiers, visibleNodes, selectedId]);
  // A single exact-ish match is auto-selected; that is the "selecting" path.
  const searchMatches = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q || !loaded) return [];
    return loaded.universe.nodes.filter((n) => n.id.includes(q));
  }, [search, loaded]);

  const handleSearch = useCallback((q: string) => {
    setSearch(q);
    const trimmed = q.trim().toLowerCase();
    if (!trimmed || !loaded) return;
    const matches = loaded.universe.nodes.filter((n) => n.id.includes(trimmed));
    if (matches.length === 1) setSelectedId(matches[0].id);
  }, [loaded]);
  const searchInfo: string | null = useMemo(() => {
    const q = search.trim();
    if (!q) return null;
    if (searchMatches.length === 0) return `No handles match "${q}"`;
    return `${searchMatches.length} match${searchMatches.length === 1 ? "" : "es"}`;
  }, [search, searchMatches]);

  if (!loaded || !layout) {
    return (
      <div className="flex h-full items-center justify-center" style={{ background: GREYS.bg, color: GREYS.textSecondary }}>
        <p className="font-mono text-[12px]">Settling the force layout…</p>
      </div>
    );
  }

  const selectedNode: Node | null = selectedId ? nodesById.get(selectedId) ?? null : null;

  return (
    <div className="relative h-full w-full" style={{ background: GREYS.bg }}>
      <Canvas
        camera={{ position: [0, 60, ZOOM_CLOSE_DISTANCE], fov: 55, near: 0.1, far: 4000 }}
        onPointerMissed={() => onSelect(null)}
        gl={{ antialias: true }}
        dpr={[1, 2]}
      >
        <Scene
          visibleNodes={visibleNodes}
          edges={visibleEdges}
          positions={layout.positions}
          clusters={clusters}
          selectedId={selectedId}
          onSelect={onSelect}
          lighting="ambient-plus-directional"
        />
      </Canvas>

      <Labels />
      <Hud
        isSynthetic={loaded.isSynthetic}
        syntheticNotice={loaded.error}
        totalNodeCount={loaded.universe.nodes.length}
        visibleNodeCount={visibleNodes.length}
        hiddenTiers={hiddenTiers}
        onToggleTier={toggleTier}
        search={search}
        onSearch={handleSearch}
        searchInfo={searchInfo}
      />

      {/* Right rail: detail panel */}
      <div className="pointer-events-none absolute top-3 right-3">
        <DetailPanel node={selectedNode} onClose={() => onSelect(null)} />
      </div>

      {/* Search empty state */}
      {searchInfo?.startsWith("No handles") && (
        <div
          className="pointer-events-none absolute top-16 left-1/2 -translate-x-1/2 rounded-sm border px-4 py-2 font-mono text-[12px]"
          style={{ borderColor: GREYS.hairline, background: GREYS.panel, color: ACCENT }}
          role="alert"
        >
          {searchInfo} — try a different handle.
        </div>
      )}
    </div>
  );
}

export type { LayoutParams };