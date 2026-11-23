"use client";

import { useEffect, useMemo, useState } from "react";
import type { GeoJSONSource, MapLayerMouseEvent } from "maplibre-gl";
import { toMapResult, type ZimaSearchResult } from "@/lib/zima/searchResults";
import { searchCityIdForLocation } from "../../../shared/zimaSearchCities";
import { easeToPlace } from "./camera";
import { useMap } from "./Globe";
import ResultMarkers, { type MarkerInput } from "./ResultMarkers";
import { HOPAMINE_BLUE } from "./globePalettes";
import { NYC_MAX_ZOOM, NYC_MIN_ZOOM, NYC_REGION_VIEW } from "./nycRegion";

const SOURCE_ID = "zima-people";
const CLUSTER_LAYER_ID = "zima-people-clusters";
const COUNT_LAYER_ID = "zima-people-counts";
const POINT_LAYER_ID = "zima-people-points";
/** Matches `clusterMaxZoom` on the source. Past this, a blob is one city. */
const CLUSTER_MAX_ZOOM = 8;

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
  /**
   * After a search (half-map results): keep avatar cards visible when zoomed
   * out, instead of collapsing to dots below NYC_MIN_ZOOM.
   */
  alwaysShowCards?: boolean;
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
 * One avatar card per person once zoomed in. Far out, a city shows a handful
 * of faces; at street scale, everyone there gets a card. People on the same
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
 * Every placed Hopamine user. Far away they cluster as dots. Zoomed into a
 * city (or after search, which opens at street scale), each person is an
 * avatar card.
 */
export function GlobePeople({
  profiles,
  selectedResultId = null,
  onSelectResult,
  alwaysShowCards = false,
}: Props) {
  const map = useMap();
  const cityScale = useCityScale();
  const showCardsAtCityScale = alwaysShowCards || cityScale;
  const markers = useMemo(
    () => fanProfiles(profiles, showCardsAtCityScale),
    [showCardsAtCityScale, profiles],
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
    // Cards already cover people after search — skip cluster dots.
    if (alwaysShowCards) return;

    const container = map.getCanvasContainer();
    let cancelled = false;

    const showPointer = () => {
      container.style.cursor = "pointer";
    };
    const hidePointer = () => {
      container.style.cursor = "";
    };

    const centerOf = (event: MapLayerMouseEvent): [number, number] | null => {
      const geometry = event.features?.[0]?.geometry;
      if (!geometry || geometry.type !== "Point") return null;
      const [lng, lat] = geometry.coordinates;
      return [lng, lat];
    };

    // A regional blob steps in until it splits. Once the blob is a single
    // city, the same click finishes the dive and the faces replace the dot.
    const onClusterClick = (event: MapLayerMouseEvent) => {
      const center = centerOf(event);
      const clusterId = Number(event.features?.[0]?.properties?.cluster_id);
      if (!center || !Number.isFinite(clusterId)) return;
      const source = map.getSource(SOURCE_ID) as GeoJSONSource | undefined;
      if (!source) return;
      void source.getClusterExpansionZoom(clusterId).then((expansion) => {
        if (cancelled) return;
        const stepped = Math.max(expansion, map.getZoom() + 2.2);
        easeToPlace(
          map,
          center,
          stepped > CLUSTER_MAX_ZOOM
            ? Math.max(stepped, NYC_REGION_VIEW.zoom)
            : stepped,
          NYC_MAX_ZOOM,
        );
      });
    };

    const onPointClick = (event: MapLayerMouseEvent) => {
      const center = centerOf(event);
      if (!center) return;
      easeToPlace(
        map,
        center,
        Math.max(NYC_REGION_VIEW.zoom, map.getZoom() + 1.4),
        NYC_MAX_ZOOM,
      );
    };

    let listening = false;
    const listen = () => {
      if (listening || !map.getLayer(CLUSTER_LAYER_ID)) return;
      listening = true;
      map.on("click", CLUSTER_LAYER_ID, onClusterClick);
      map.on("click", POINT_LAYER_ID, onPointClick);
      map.on("mouseenter", CLUSTER_LAYER_ID, showPointer);
      map.on("mouseenter", POINT_LAYER_ID, showPointer);
      map.on("mouseleave", CLUSTER_LAYER_ID, hidePointer);
      map.on("mouseleave", POINT_LAYER_ID, hidePointer);
    };

    const sync = () => {
      if (!map.isStyleLoaded()) return;
      const existing = map.getSource(SOURCE_ID) as GeoJSONSource | undefined;
      if (existing) {
        existing.setData(data);
        listen();
        return;
      }

      map.addSource(SOURCE_ID, {
        type: "geojson",
        data,
        cluster: true,
        clusterRadius: 48,
        clusterMaxZoom: CLUSTER_MAX_ZOOM,
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
      listen();
    };

    sync();
    map.on("load", sync);
    return () => {
      cancelled = true;
      map.off("load", sync);
      if (listening) {
        map.off("click", CLUSTER_LAYER_ID, onClusterClick);
        map.off("click", POINT_LAYER_ID, onPointClick);
        map.off("mouseenter", CLUSTER_LAYER_ID, showPointer);
        map.off("mouseenter", POINT_LAYER_ID, showPointer);
        map.off("mouseleave", CLUSTER_LAYER_ID, hidePointer);
        map.off("mouseleave", POINT_LAYER_ID, hidePointer);
        hidePointer();
      }
      if (map.getLayer(COUNT_LAYER_ID)) map.removeLayer(COUNT_LAYER_ID);
      if (map.getLayer(CLUSTER_LAYER_ID)) map.removeLayer(CLUSTER_LAYER_ID);
      if (map.getLayer(POINT_LAYER_ID)) map.removeLayer(POINT_LAYER_ID);
      if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
    };
  }, [map, data, alwaysShowCards]);

  return (
    <ResultMarkers
      results={markers}
      minZoom={alwaysShowCards ? 0 : NYC_MIN_ZOOM}
      selectedResultId={selectedResultId}
      onSelectResult={onSelectResult}
    />
  );
}
