"use client";

import { useRef, useState } from "react";
import type { GlobeHandle } from "./Globe";
import type { GlobeView } from "./camera";
import ZimaChrome from "./chrome/ZimaChrome";
import { GlobePeople } from "./GlobePeople";
import { SearchProvider, useSearch } from "./search";
import { ZimaGlobeBackdrop } from "./ZimaGlobeBackdrop";
import { useZimaGlobeProfiles } from "@/app/zima/useZimaGlobeProfiles";

/**
 * Where a sent message takes the camera for now: The Spiral at Hudson Yards,
 * the terraced tower with greenery climbing every floor. Top-down, at the
 * neighbourhood scale where the street grid and parks read clearly.
 */
// TODO: Delete — experiment. Roughly the centre of the five boroughs; the
// shared preload cone is planned around it.

const THE_SPIRAL: GlobeView = {
  center: [-73.9993, 40.7555],
  // TODO: Delete — experiment. Was 15.5; 13 keeps the flight within the
  // source's native zooms and needs far fewer tiles to preload.
  zoom: 13,
  pitch: 0,
  bearing: 0,
};

/** Framed globe with the prompt chrome layered over it. */
export default function ZimaScene() {
  return (
    <SearchProvider>
      <Scene />
    </SearchProvider>
  );
}

/** Wires the globe to the shared search state; every surface reads the rest. */
function Scene() {
  const globeRef = useRef<GlobeHandle>(null);
  const [mapHeld, setMapHeld] = useState(false);
  const search = useSearch();
  const profiles = useZimaGlobeProfiles();

  const handleSend = (text: string) => {
    search.send(text);
    globeRef.current?.flyTo(THE_SPIRAL, { onDone: search.arrive });
  };

  return (
    <>
      <ZimaGlobeBackdrop ref={globeRef} onHoldChange={setMapHeld}>
        <GlobePeople profiles={profiles} />
      </ZimaGlobeBackdrop>
      <ZimaChrome onSend={handleSend} mapHeld={mapHeld} />
    </>
  );
}
