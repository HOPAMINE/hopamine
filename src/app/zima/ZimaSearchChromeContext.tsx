"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type ZimaMapLayerId = "people" | "projects" | "events";

export type ZimaMapLayers = Record<ZimaMapLayerId, boolean>;

export const DEFAULT_ZIMA_MAP_LAYERS: ZimaMapLayers = {
  people: true,
  projects: false,
  events: false,
};

type ZimaSearchChromeContextValue = {
  /** After first search on mobile: hide top-right profile so search can use that space. */
  hideMobileTopProfile: boolean;
  setHideMobileTopProfile: (hidden: boolean) => void;
  /** Which pin kinds show on the globe / search map. Multi-select. */
  mapLayers: ZimaMapLayers;
  toggleMapLayer: (layer: ZimaMapLayerId) => void;
};

const ZimaSearchChromeContext = createContext<ZimaSearchChromeContextValue>({
  hideMobileTopProfile: false,
  setHideMobileTopProfile: () => {},
  mapLayers: DEFAULT_ZIMA_MAP_LAYERS,
  toggleMapLayer: () => {},
});

export function ZimaSearchChromeProvider({ children }: { children: ReactNode }) {
  const [hideMobileTopProfile, setHideMobileTopProfile] = useState(false);
  const [mapLayers, setMapLayers] = useState<ZimaMapLayers>(
    DEFAULT_ZIMA_MAP_LAYERS,
  );
  const setHidden = useCallback((hidden: boolean) => {
    setHideMobileTopProfile(hidden);
  }, []);
  const toggleMapLayer = useCallback((layer: ZimaMapLayerId) => {
    setMapLayers((prev) => ({ ...prev, [layer]: !prev[layer] }));
  }, []);
  const value = useMemo(
    () => ({
      hideMobileTopProfile,
      setHideMobileTopProfile: setHidden,
      mapLayers,
      toggleMapLayer,
    }),
    [hideMobileTopProfile, mapLayers, setHidden, toggleMapLayer],
  );

  return (
    <ZimaSearchChromeContext.Provider value={value}>
      {children}
    </ZimaSearchChromeContext.Provider>
  );
}

export function useZimaSearchChrome() {
  return useContext(ZimaSearchChromeContext);
}
