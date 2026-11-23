"use client";

import { useEffect, useState } from "react";
import { GlobePeople } from "@/components/zima/GlobePeople";
import { GlobeProjects } from "@/components/zima/GlobeProjects";
import { ZimaGlobeBackdrop } from "@/components/zima/ZimaGlobeBackdrop";
import { ZimaLogo } from "./ZimaLogo";
import { ZIMA_FIXED_LOGO_TOP_LEFT } from "./zimaLogoPlacement";
import { useZimaGlobeProfiles } from "./useZimaGlobeProfiles";
import { useZimaSearchChrome } from "./ZimaSearchChromeContext";
import { ZimaShell } from "./ZimaShell";

export function ZimaPageClient() {
  const [isChatMode, setIsChatMode] = useState(false);
  const profiles = useZimaGlobeProfiles();
  const { mapLayers, setHideMobileTopProfile } = useZimaSearchChrome();

  useEffect(() => {
    setHideMobileTopProfile(isChatMode);
    return () => setHideMobileTopProfile(false);
  }, [isChatMode, setHideMobileTopProfile]);

  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col bg-white md:min-h-dvh">
      {!isChatMode ? (
        <ZimaGlobeBackdrop
          extendUnderTopChrome
          className="z-0 bg-white"
        >
          {mapLayers.people ? <GlobePeople profiles={profiles} /> : null}
          {mapLayers.projects ? <GlobeProjects /> : null}
        </ZimaGlobeBackdrop>
      ) : null}
      {!isChatMode ? (
        <ZimaLogo
          priority
          className={`${ZIMA_FIXED_LOGO_TOP_LEFT} z-30`}
          linked
        />
      ) : (
        <div className="hidden md:block">
          <ZimaLogo
            priority
            className={`${ZIMA_FIXED_LOGO_TOP_LEFT} z-30`}
            linked={false}
            onClick={() => setIsChatMode(false)}
          />
        </div>
      )}
      <ZimaShell
        isChatMode={isChatMode}
        onChatModeChange={setIsChatMode}
        profiles={profiles}
      />
    </div>
  );
}
