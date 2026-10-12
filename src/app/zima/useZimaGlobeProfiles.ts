"use client";

import { useAction, useQuery } from "convex/react";
import { useEffect, useRef } from "react";
import { api } from "../../../convex/_generated/api";
import type { ZimaSearchResult } from "@/lib/zima/searchResults";

/** Full Hopamine directory for the globe. Unknown cities geocode once, then stay cached. */
export function useZimaGlobeProfiles(): ZimaSearchResult[] {
  const data = useQuery(api.zimaGlobe.profiles, {});
  const geocodeMissing = useAction(api.zimaGlobe.geocodeMissing);
  const inFlight = useRef<string | null>(null);

  const pending = data?.pendingLocations ?? [];
  const pendingKey = pending.join("\n");

  useEffect(() => {
    if (!pendingKey || inFlight.current === pendingKey) return;
    inFlight.current = pendingKey;
    void geocodeMissing({ locations: pending }).catch((error: unknown) => {
      console.error("Zima globe geocode failed", error);
      if (inFlight.current === pendingKey) inFlight.current = null;
    });
  }, [geocodeMissing, pending, pendingKey]);

  return data?.profiles ?? [];
}
