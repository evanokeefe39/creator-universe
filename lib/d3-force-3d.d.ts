/** Minimal ambient types for d3-force-3d (the package ships no declarations). */
declare module "d3-force-3d" {
  export type SimulationNodeDatum = {
    x?: number;
    y?: number;
    z?: number;
    vx?: number;
    vy?: number;
    vz?: number;
    index?: number;
  };

  export type SimulationLinkDatum<N> = {
    source: string | number | N;
    target: string | number | N;
  };

  /** A force factory mid-configuration; every setter returns itself. */
  export interface ForceConfig<N extends SimulationNodeDatum, L extends SimulationLinkDatum<N>> {
    id(fn: (n: N) => string): ForceConfig<N, L>;
    distance(v: number | ((l: L, i: number) => number)): ForceConfig<N, L>;
    strength(v: number | ((l: L) => number) | ((n: N) => number)): ForceConfig<N, L>;
    distanceMax(v: number): ForceConfig<N, L>;
    iterations(v: number): ForceConfig<N, L>;
    /** A configured force is called by the simulation with the current alpha. */
    (alpha: number): void;
  }

  export type Simulation<N extends SimulationNodeDatum, L> = {
    force(name: string, f: ForceConfig<N, L> | ((alpha: number) => void)): Simulation<N, L>;
    alpha(): number;
    alpha(v: number): Simulation<N, L>;
    alphaMin(): number;
    alphaMin(v: number): Simulation<N, L>;
    alphaDecay(v: number): Simulation<N, L>;
    velocityDecay(v: number): Simulation<N, L>;
    tick(): Simulation<N, L>;
    stop(): Simulation<N, L>;
    restart(): Simulation<N, L>;
    nodes(): N[];
    nodes(nodes: N[]): Simulation<N, L>;
  };

  export function forceSimulation<N extends SimulationNodeDatum, L = undefined>(
    nodes?: N[],
    dimensions?: number,
  ): Simulation<N, L>;

  export function forceLink<N extends SimulationNodeDatum, L extends SimulationLinkDatum<N>>(
    links?: L[],
  ): ForceConfig<N, L>;

  export function forceManyBody<N extends SimulationNodeDatum>(): ForceConfig<N, SimulationLinkDatum<N>>;

  export function forceCenter<N extends SimulationNodeDatum>(
    x: number,
    y: number,
    z?: number,
  ): ForceConfig<N, SimulationLinkDatum<N>>;

  export function forceCollide<N extends SimulationNodeDatum>(
    radius: number | ((n: N) => number),
  ): ForceConfig<N, SimulationLinkDatum<N>>;

  export function forceX<N extends SimulationNodeDatum>(x?: number): ForceConfig<N, SimulationLinkDatum<N>>;
  export function forceY<N extends SimulationNodeDatum>(y?: number): ForceConfig<N, SimulationLinkDatum<N>>;
  export function forceZ<N extends SimulationNodeDatum>(z?: number): ForceConfig<N, SimulationLinkDatum<N>>;
}