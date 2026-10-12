"use client";

import { useEffect, useMemo } from "react";
import type { ZimaSearchResult } from "@/lib/zima/searchResults";
import {
  zimaSearchCityById,
  type ZimaSearchCityId,
} from "../../../shared/zimaSearchCities";
import Globe, { useMap } from "./Globe";
import { GlobePeople } from "./GlobePeople";
import type { GlobeView } from "./camera";
import { NATURAL_MAP_PALETTE } from "./globePalettes";
import { NYC_REGION_VIEW } from "./nycRegion";

function cityView(cityId: ZimaSearchCityId): GlobeView {
  if (cityId === "new-york-city") return NYC_REGION_VIEW;
  const city = zimaSearchCityById(cityId);
  return {
    center: [city.lng, city.lat],
    zoom: NYC_REGION_VIEW.zoom,
    pitch: 0,
    bearing: 0,
  };
}

/** Moves the camera when the search city changes. The first frame is initialView. */
function SyncMapView({ view }: { view: GlobeView }) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    const current = map.getCenter();
    const [lng, lat] = view.center;
    const alreadyThere =
      Math.abs(current.lng - lng) < 0.02 && Math.abs(current.lat - lat) < 0.02;
    if (alreadyThere) return;
    map.easeTo({
      center: [lng, lat],
      zoom: view.zoom,
      pitch: view.pitch ?? 0,
      bearing: view.bearing ?? 0,
      duration: 800,
    });
  }, [map, view]);

  return null;
}

type Props = {
  /** Every placed Hopamine user, drawn as avatar cards. */
  directory: ZimaSearchResult[];
  cityId?: ZimaSearchCityId;
  /** When false, cards stay visible but don't open a profile. */
  showPins?: boolean;
  className?: string;
  /** Bumps MapLibre resize when the wrapper moves (e.g. landing → results). */
  layoutKey?: string | number | boolean;
  selectedResultId?: string | null;
  onSelectResult?: (id: string) => void;
};

/** Hopamine map starting on NYC; pan and zoom freely. Fills its wrapper like the home globe. */
export default function ZimaSearchMap({
  directory,
  cityId = "new-york-city",
  showPins = false,
  className = "absolute inset-0 overflow-hidden",
  layoutKey,
  selectedResultId = null,
  onSelectResult,
}: Props) {
  const view = useMemo(() => cityView(cityId), [cityId]);

  return (
    <Globe
      className={className}
      layoutKey={layoutKey}
      initialView={view}
      warmCenter={view.center}
      spin={false}
      palette={NATURAL_MAP_PALETTE}
      styleOptions={{ projection: "mercator", natural: true }}
    >
      <SyncMapView view={view} />
      <GlobePeople
        profiles={directory}
        selectedResultId={showPins ? selectedResultId : null}
        onSelectResult={showPins ? onSelectResult : undefined}
      />
    </Globe>
  );
}
