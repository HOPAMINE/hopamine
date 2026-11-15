"use client";

import { useMemo } from "react";
import {
  useZimaGlobeProjects,
  type ZimaGlobeProject,
} from "@/app/zima/useZimaGlobeProjects";
import type { MapResult } from "./results";
import ResultMarkers, { type MarkerInput } from "./ResultMarkers";
import { NYC_MIN_ZOOM } from "./nycRegion";
import { searchCityIdForLocation } from "../../../shared/zimaSearchCities";

const WORLD_PILLS_PER_PLACE = 4;
const PER_RING = 6;

type Props = {
  /**
   * After a search (half-map results): keep project pills visible when zoomed
   * out, matching GlobePeople's alwaysShowCards.
   */
  alwaysShowCards?: boolean;
};

function toProjectMapResult(project: ZimaGlobeProject): MapResult {
  return {
    id: project._id,
    kind: "project",
    name: project.title,
    description: project.blurb,
    lng: project.lng,
    lat: project.lat,
    avatarUrl: "",
  };
}

/** Screen-space ring so pills that share a city stay readable. */
function fanOffset(index: number, count: number): [number, number] {
  if (count <= 1) return [0, 0];
  const ring = Math.floor(index / PER_RING);
  const slot = index % PER_RING;
  const radius = 52 + ring * 44;
  const angle = (slot / PER_RING) * Math.PI * 2 - Math.PI / 2;
  return [
    Math.round(Math.cos(angle) * radius),
    Math.round(Math.sin(angle) * radius),
  ];
}

function placeKey(project: ZimaGlobeProject): string {
  return (
    searchCityIdForLocation(project.location) ??
    `${Math.round(project.lng)}:${Math.round(project.lat)}`
  );
}

function fanProjects(projects: ZimaGlobeProject[]): MarkerInput[] {
  const groups = new Map<string, ZimaGlobeProject[]>();
  for (const project of projects) {
    const key = placeKey(project);
    const group = groups.get(key);
    if (group) group.push(project);
    else groups.set(key, [project]);
  }

  const markers: MarkerInput[] = [];
  for (const group of groups.values()) {
    const shown = group.slice(0, WORLD_PILLS_PER_PLACE);
    const ordered = [...shown].sort((a, b) => a._id.localeCompare(b._id));
    ordered.forEach((project, index) => {
      markers.push({
        ...toProjectMapResult(project),
        offset: fanOffset(index, ordered.length),
      });
    });
  }
  return markers;
}

/**
 * Project pins on the globe — white sprout pills. Same zoom gate as person
 * cards unless alwaysShowCards (search results map).
 */
export function GlobeProjects({ alwaysShowCards = false }: Props) {
  const projects = useZimaGlobeProjects();
  const markers = useMemo(() => fanProjects(projects), [projects]);

  return (
    <ResultMarkers
      results={markers}
      minZoom={alwaysShowCards ? 0 : NYC_MIN_ZOOM}
    />
  );
}
