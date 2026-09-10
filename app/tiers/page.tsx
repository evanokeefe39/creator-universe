import Link from "next/link";
import { TiersGrid } from "@/components/tiers-grid";

export default function TiersPage() {
  return (
    <>
      <Link
        href="/"
        className="absolute top-3 right-3 z-10 rounded-sm border px-3 py-1.5 font-mono text-[11px]"
        style={{ borderColor: "rgba(255,255,255,0.14)", background: "rgba(13,15,19,0.82)", color: "#9aa0a8" }}
      >
        ← universe
      </Link>
      <TiersGrid />
    </>
  );
}