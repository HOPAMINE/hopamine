"use client";

import { useAction, useQuery } from "convex/react";
import { useEffect, useRef } from "react";
import { api } from "../../../convex/_generated/api";
import type { FunctionReturnType } from "convex/server";

export type ZimaGlobeProject = FunctionReturnType<
  typeof api.zimaGlobe.projects
>["projects"][number];

/** Projects with a location, created after Nov 14 2026, placed on the globe. */
export function useZimaGlobeProjects(): ZimaGlobeProject[] {
  const data = useQuery(api.zimaGlobe.projects, {});
  const geocodeMissing = useAction(api.zimaGlobe.geocodeMissing);
  const inFlight = useRef<string | null>(null);

  const pending = data?.pendingLocations ?? [];
  const pendingKey = pending.join("\n");

  useEffect(() => {
    if (!pendingKey || inFlight.current === pendingKey) return;
    inFlight.current = pendingKey;
    void geocodeMissing({ locations: pending }).catch((error: unknown) => {
      console.error("Zima globe project geocode failed", error);
      if (inFlight.current === pendingKey) inFlight.current = null;
    });
  }, [geocodeMissing, pending, pendingKey]);

  return data?.projects ?? [];
}
