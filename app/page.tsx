import Link from "next/link";
import { UniverseApp } from "@/components/universe-app";

export default function Home() {
  return (
    <main className="relative h-full w-full">
      <UniverseApp />
      <nav
        className="pointer-events-auto absolute bottom-3 left-1/2 z-10 -translate-x-1/2 rounded-sm border px-3 py-1.5 font-mono text-[11px]"
        style={{ borderColor: "rgba(255,255,255,0.14)", background: "rgba(13,15,19,0.82)", color: "#9aa0a8" }}
      >
        <Link href="/tiers" className="hover:text-white">
          /tiers
        </Link>
        <span className="mx-2 text-white/20">|</span>
        <Link href="/diagnostics" className="hover:text-white">
          /diagnostics
        </Link>
      </nav>
    </main>
  );
}