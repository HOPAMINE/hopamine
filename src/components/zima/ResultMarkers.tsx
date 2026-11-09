"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Marker } from "maplibre-gl";
import { jetbrainsMono } from "../../../fonts";
import { useMap } from "./Globe";
import { HOPAMINE_BLUE } from "./globePalettes";
import { NYC_MIN_ZOOM } from "./nycRegion";
import type { MapResult } from "./results";

export type MarkerInput = MapResult & {
  /** Pixel offset from the lng/lat so people who share a city don't stack. */
  offset?: [number, number];
};

type Host = {
  result: MarkerInput;
  el: HTMLDivElement;
};

type Props = {
  results: MarkerInput[];
  /**
   * Cards stay hidden below this zoom. The globe passes 0 so faces stay on
   * the sphere; the old city map waited until streets were readable.
   */
  minZoom?: number;
  selectedResultId?: string | null;
  onSelectResult?: (id: string) => void;
};

const MARKER_SHADOW = "0 4px 4px rgba(0, 0, 0, 0.25)";

const ORG_PILL_STYLE = {
  backgroundColor: "#FFFFFF",
  color: HOPAMINE_BLUE,
} as const;

/**
 * Builders: rounded avatar cards with a bottom spike on the lng/lat.
 * Organizations (projects): white pill + sprout icon, centered on the point.
 */
export default function ResultMarkers({
  results,
  minZoom = NYC_MIN_ZOOM,
  selectedResultId = null,
  onSelectResult,
}: Props) {
  const map = useMap();
  const [zoomedIn, setZoomedIn] = useState(minZoom <= 0);
  const [scale, setScale] = useState(1);
  const [hosts, setHosts] = useState<Host[]>([]);
  const hostsById = useRef(new Map<string, Host>());
  const markersById = useRef(new Map<string, Marker>());

  useEffect(() => {
    if (!map) return;
    const apply = () => {
      const zoom = map.getZoom();
      setZoomedIn(zoom >= minZoom);
      setScale(zoom >= NYC_MIN_ZOOM ? 1 : 0.78);
    };
    apply();
    map.on("zoom", apply);
    return () => {
      map.off("zoom", apply);
    };
  }, [map, minZoom]);

  useEffect(() => {
    const markers = markersById.current;
    const hostsForMap = hostsById.current;
    return () => {
      for (const marker of markers.values()) marker.remove();
      markers.clear();
      hostsForMap.clear();
    };
  }, [map]);

  useEffect(() => {
    if (!map) return;

    const seen = new Set<string>();
    for (const result of results) {
      seen.add(result.id);
      const offset = result.offset ?? [0, 0];
      const existing = hostsById.current.get(result.id);
      if (existing) {
        existing.result = result;
        const marker = markersById.current.get(result.id);
        marker?.setLngLat([result.lng, result.lat]);
        marker?.setOffset(offset);
        continue;
      }

      const el = document.createElement("div");
      hostsById.current.set(result.id, { result, el });
      const marker = new Marker({
        element: el,
        anchor: result.kind === "project" ? "center" : "bottom",
        offset,
        opacityWhenCovered: 0,
      })
        .setLngLat([result.lng, result.lat])
        .addTo(map);
      markersById.current.set(result.id, marker);
    }

    for (const id of [...hostsById.current.keys()]) {
      if (seen.has(id)) continue;
      markersById.current.get(id)?.remove();
      markersById.current.delete(id);
      hostsById.current.delete(id);
    }

    setHosts([...hostsById.current.values()]);
  }, [map, results]);

  useEffect(() => {
    for (const { result, el } of hosts) {
      const isSelected = selectedResultId === result.id;
      el.style.zIndex = isSelected ? "2" : selectedResultId ? "0" : "1";
      el.style.pointerEvents = onSelectResult ? "auto" : "none";
    }
  }, [hosts, onSelectResult, selectedResultId]);

  useEffect(() => {
    if (!map || !selectedResultId) return;
    const result = results.find((item) => item.id === selectedResultId);
    if (!result) return;
    map.easeTo({
      center: [result.lng, result.lat],
      duration: 650,
      essential: true,
    });
  }, [map, results, selectedResultId]);

  return (
    <>
      {hosts.map(({ result, el }) =>
        createPortal(
          result.kind === "project" ? (
            <OrganizationPill
              result={result}
              visible={zoomedIn}
              scale={scale}
              selected={selectedResultId === result.id}
              onSelect={onSelectResult}
            />
          ) : (
            <PersonMarker
              result={result}
              visible={zoomedIn}
              scale={scale}
              selected={selectedResultId === result.id}
              onSelect={onSelectResult}
            />
          ),
          el,
          result.id,
        ),
      )}
    </>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.charAt(0) ?? "";
  const last =
    parts.length > 1 ? (parts[parts.length - 1]?.charAt(0) ?? "") : "";
  const letters = `${first}${last}`.toUpperCase();
  return letters || "?";
}

function PersonMarker({
  result,
  visible,
  scale,
  selected,
  onSelect,
}: {
  result: MapResult;
  visible: boolean;
  scale: number;
  selected: boolean;
  onSelect?: (id: string) => void;
}) {
  const interactive = visible && Boolean(onSelect);
  const drawnScale = selected ? scale * 1.08 : scale;

  return (
    <button
      type="button"
      title={result.description}
      onClick={() => onSelect?.(result.id)}
      disabled={!interactive}
      className={`flex flex-col items-center border-0 bg-transparent p-0 transition-[opacity,transform] duration-300 ${
        visible ? "opacity-100" : "pointer-events-none opacity-0"
      } ${interactive ? "cursor-pointer" : ""}`}
      style={{
        transform: `scale(${drawnScale})`,
        transformOrigin: "bottom center",
      }}
    >
      <div
        className={`flex w-[76px] flex-col overflow-hidden rounded-2xl border bg-white ${
          selected
            ? "border-[#00a6f3] ring-2 ring-[#00a6f3] ring-inset"
            : "border-neutral-200/90"
        }`}
        style={{ boxShadow: MARKER_SHADOW }}
      >
        <div className="relative aspect-square w-full bg-neutral-100">
          <AvatarFace result={result} />
        </div>
        <p
          className={`${jetbrainsMono.className} truncate px-1.5 py-1.5 text-center text-[9px] font-semibold uppercase leading-tight tracking-wide text-neutral-900`}
        >
          {result.name}
        </p>
      </div>
      <MapPinSpike selected={selected} />
    </button>
  );
}

function getMarkerAvatarSources(avatarUrl: string): { src: string; srcSet?: string } {
  let url: URL;
  try {
    url = new URL(avatarUrl);
  } catch {
    return { src: avatarUrl };
  }
  if (
    url.protocol !== "https:" ||
    url.hostname !== "img.clerk.com" ||
    url.port !== ""
  ) {
    return { src: avatarUrl };
  }

  url.searchParams.set("quality", "80");
  url.searchParams.set("fit", "crop");
  // Stable sizes cover the 76px card at 1x/2x/3x without changing on zoom.
  const sources = [80, 160, 240].map((size) => {
    url.searchParams.set("width", String(size));
    url.searchParams.set("height", String(size));
    return url.toString();
  });
  return {
    src: sources[0],
    srcSet: sources.map((src, index) => `${src} ${index + 1}x`).join(", "),
  };
}

function AvatarFace({ result }: { result: MapResult }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const isLogo = result.avatarUrl.startsWith("/");
  const hasFailed = failedUrl === result.avatarUrl;

  if (!result.avatarUrl || hasFailed) {
    return (
      <span
        className={`${jetbrainsMono.className} flex h-full w-full items-center justify-center text-lg font-semibold text-neutral-500`}
      >
        {initials(result.name)}
      </span>
    );
  }

  const sources = getMarkerAvatarSources(result.avatarUrl);

  return (
    // Direct Clerk CDN delivery with 1x/2x/3x srcSet avoids an extra Next.js optimization hop.
    // Native <img> is retained for direct CDN requests; portals do not prevent next/image.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={sources.src}
      srcSet={sources.srcSet}
      alt=""
      decoding="async"
      onError={() => setFailedUrl(result.avatarUrl)}
      className={`h-full w-full object-cover ${isLogo ? "object-contain p-2" : ""}`}
      style={isLogo ? undefined : { imageRendering: "pixelated" }}
    />
  );
}

/** White rounded pill with sprout icon — org / project pins on the map. */
function OrganizationPill({
  result,
  visible,
  scale,
  selected,
  onSelect,
}: {
  result: MapResult;
  visible: boolean;
  scale: number;
  selected: boolean;
  onSelect?: (id: string) => void;
}) {
  const interactive = visible && Boolean(onSelect);
  const drawnScale = selected ? scale * 1.08 : scale;

  return (
    <button
      type="button"
      title={result.description}
      onClick={() => onSelect?.(result.id)}
      disabled={!interactive}
      className={`${jetbrainsMono.className} flex h-7 max-w-[min(10rem,42vw)] items-center gap-1 rounded-full border-0 pl-3 pr-3.5 text-[11px] font-semibold uppercase leading-none tracking-wide transition-[opacity,transform] duration-300 sm:h-[28px] sm:max-w-[10vw] sm:gap-1 sm:pl-3 sm:pr-4 sm:text-[13px] ${
        visible ? "opacity-100" : "pointer-events-none opacity-0"
      } ${interactive ? "cursor-pointer" : ""}`}
      style={{
        backgroundColor: ORG_PILL_STYLE.backgroundColor,
        color: ORG_PILL_STYLE.color,
        boxShadow: MARKER_SHADOW,
        transform: `scale(${drawnScale})`,
        transformOrigin: "center center",
      }}
    >
      <SproutIcon />
      <span className="truncate">{result.name}</span>
    </button>
  );
}

function SproutIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0 sm:h-[18px] sm:w-[18px]"
      aria-hidden
    >
      <path d="M12 21v-9" />
      <path d="M12 12c0-4 3-7 7-7 0 4-3 7-7 7z" />
      <path d="M12 15c0-3-2.5-5-5.5-5 0 3 2.5 5 5.5 5z" />
    </svg>
  );
}

/** Small triangle; bottom vertex is the map anchor point. */
function MapPinSpike({ selected }: { selected: boolean }) {
  return (
    <div
      aria-hidden
      className={`h-0 w-0 border-x-[7px] border-t-[9px] border-x-transparent ${
        selected ? "border-t-[#00a6f3]" : "border-t-white"
      }`}
      style={{
        filter: "drop-shadow(0 2px 1px rgba(0, 0, 0, 0.12))",
        marginTop: -1,
      }}
    />
  );
}
