"use client";

import { useEffect, useMemo, useState } from "react";
import type { GeoJSONSource } from "maplibre-gl";
import { toMapResult, type ZimaSearchResult } from "@/lib/zima/searchResults";
import { searchCityIdForLocation } from "../../../shared/zimaSearchCities";
import { useMap } from "./Globe";
import ResultMarkers, { type MarkerInput } from "./ResultMarkers";
import { HOPAMINE_BLUE } from "./globePalettes";
import { NYC_MIN_ZOOM } from "./nycRegion";

const SOURCE_ID = "zima-people";
const CLUSTER_LAYER_ID = "zima-people-clusters";
const COUNT_LAYER_ID = "zima-people-counts";
const POINT_LAYER_ID = "zima-people-points";

/** Faces shown per city while the whole globe is in frame. Zooming in reveals everyone. */
const WORLD_CARDS_PER_PLACE = 6;
const PER_RING = 6;

type PointCollection = {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    geometry: { type: "Point"; coordinates: [number, number] };
    properties: { id: string };
  }>;
};

type Props = {
  profiles: ZimaSearchResult[];
  selectedResultId?: string | null;
  onSelectResult?: (id: string) => void;
};

/** Screen-space ring so cards that share a point stay readable. */
function fanOffset(
  index: number,
  count: number,
  cityScale: boolean,
): [number, number] {
  if (count <= 1) return [0, 0];
  const ring = Math.floor(index / PER_RING);
  const slot = index % PER_RING;
  const radius = (cityScale ? 78 : 46) + ring * (cityScale ? 70 : 42);
  const angle = (slot / PER_RING) * Math.PI * 2 - Math.PI / 2;
  return [
    Math.round(Math.cos(angle) * radius),
    Math.round(Math.sin(angle) * radius),
  ];
}

function placeKey(profile: ZimaSearchResult, cityScale: boolean): string {
  if (cityScale) {
    return `${Math.round(profile.lng * 50)}:${Math.round(profile.lat * 50)}`;
  }
  return (
    searchCityIdForLocation(profile.location) ??
    `${Math.round(profile.lng)}:${Math.round(profile.lat)}`
  );
}

/**
 * One avatar card per person. On the spinning globe a city shows a handful of
 * faces; zoomed into streets, everyone there gets a card. People on the same
 * point fan into a ring.
 */
function fanProfiles(
  profiles: ZimaSearchResult[],
  cityScale: boolean,
): MarkerInput[] {
  const groups = new Map<string, ZimaSearchResult[]>();
  for (const profile of profiles) {
    const key = placeKey(profile, cityScale);
    const group = groups.get(key);
    if (group) group.push(profile);
    else groups.set(key, [profile]);
  }

  const markers: MarkerInput[] = [];
  for (const group of groups.values()) {
    const shown = cityScale ? group : group.slice(0, WORLD_CARDS_PER_PLACE);
    const ordered = [...shown].sort((a, b) => a._id.localeCompare(b._id));
    ordered.forEach((profile, index) => {
      markers.push({
        ...toMapResult(profile),
        offset: fanOffset(index, ordered.length, cityScale),
      });
    });
  }
  return markers;
}

function useCityScale(): boolean {
  const map = useMap();
  const [cityScale, setCityScale] = useState(false);

  useEffect(() => {
    if (!map) return;
    const apply = () => setCityScale(map.getZoom() >= NYC_MIN_ZOOM);
    apply();
    map.on("zoom", apply);
    return () => {
      map.off("zoom", apply);
    };
  }, [map]);

  return cityScale;
}

/**
 * Every placed Hopamine user. Far away they cluster, with a ring of profile
 * cards on each city. Zoomed in, each person is the avatar card from the demo.
 */
export function GlobePeople({
  profiles,
  selectedResultId = null,
  onSelectResult,
}: Props) {
  const map = useMap();
  const cityScale = useCityScale();
  const markers = useMemo(
    () => fanProfiles(profiles, cityScale),
    [cityScale, profiles],
  );
  const data = useMemo<PointCollection>(
    () => ({
      type: "FeatureCollection",
      features: profiles.map((profile) => ({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [profile.lng, profile.lat],
        },
        properties: { id: profile._id },
      })),
    }),
    [profiles],
  );

  useEffect(() => {
    if (!map) return;

    const sync = () => {
      if (!map.isStyleLoaded()) return;
      const existing = map.getSource(SOURCE_ID) as GeoJSONSource | undefined;
      if (existing) {
        existing.setData(data);
        return;
      }

      map.addSource(SOURCE_ID, {
        type: "geojson",
        data,
        cluster: true,
        clusterRadius: 48,
        clusterMaxZoom: 8,
      });
      map.addLayer({
        id: CLUSTER_LAYER_ID,
        type: "circle",
        source: SOURCE_ID,
        filter: ["has", "point_count"],
        paint: {
          "circle-color": HOPAMINE_BLUE,
          "circle-stroke-width": 1.5,
          "circle-stroke-color": "#ffffff",
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["get", "point_count"],
            2,
            14,
            12,
            18,
            40,
            24,
            120,
            32,
          ],
        },
      });
      map.addLayer({
        id: COUNT_LAYER_ID,
        type: "symbol",
        source: SOURCE_ID,
        filter: ["has", "point_count"],
        layout: {
          "text-field": ["get", "point_count_abbreviated"],
          "text-font": ["Noto Sans Bold"],
          "text-size": 12,
        },
        paint: {
          "text-color": "#ffffff",
        },
      });
      map.addLayer({
        id: POINT_LAYER_ID,
        type: "circle",
        source: SOURCE_ID,
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": HOPAMINE_BLUE,
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["zoom"],
            0,
            4,
            4,
            5,
            8,
            7,
          ],
          "circle-stroke-width": 1.5,
          "circle-stroke-color": "#ffffff",
          "circle-opacity": ["step", ["zoom"], 1, NYC_MIN_ZOOM, 0],
          "circle-stroke-opacity": ["step", ["zoom"], 1, NYC_MIN_ZOOM, 0],
        },
      });
    };

    sync();
    map.on("load", sync);
    return () => {
      map.off("load", sync);
      if (map.getLayer(COUNT_LAYER_ID)) map.removeLayer(COUNT_LAYER_ID);
      if (map.getLayer(CLUSTER_LAYER_ID)) map.removeLayer(CLUSTER_LAYER_ID);
      if (map.getLayer(POINT_LAYER_ID)) map.removeLayer(POINT_LAYER_ID);
      if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
    };
  }, [map, data]);

  return (
    <ResultMarkers
      results={markers}
      minZoom={0}
      selectedResultId={selectedResultId}
      onSelectResult={onSelectResult}
    />
  );
}
