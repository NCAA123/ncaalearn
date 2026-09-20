import { useEffect, useState } from "react";
import { getGPUTier } from "detect-gpu";

export type QualityTier = "low" | "medium" | "high";

// detect-gpu's default benchmarksURL points at unpkg -- self-host the same
// bundled JSON under /detect-gpu-benchmarks instead (copied from
// node_modules/detect-gpu/dist/benchmarks at commit time) so the hall's
// quality detection doesn't depend on a third-party CDN being reachable.
const BENCHMARKS_URL = "/detect-gpu-benchmarks";

let cached: Promise<QualityTier> | null = null;

async function detect(): Promise<QualityTier> {
  try {
    const result = await getGPUTier({ benchmarksURL: BENCHMARKS_URL });
    if (result.tier <= 1) return "low";
    if (result.tier === 2) return "medium";
    return "high";
  } catch {
    // Unknown GPU, WebGL blocked, or the benchmark fetch failed -- default
    // to medium rather than assuming the worst or the best.
    return "medium";
  }
}

// Classifies the visitor's GPU once per page load (cached across every
// TournamentHall3D instance on the page) so the hall's shadow quality and
// device pixel ratio can scale down on weak hardware per the brief's perf
// budget (60fps mid-range laptop, >=30fps throttled mid-range phone).
export function useHallQualityTier(): QualityTier {
  const [tier, setTier] = useState<QualityTier>("medium");

  useEffect(() => {
    if (!cached) cached = detect();
    let alive = true;
    cached.then((t) => {
      if (alive) setTier(t);
    });
    return () => {
      alive = false;
    };
  }, []);

  return tier;
}
