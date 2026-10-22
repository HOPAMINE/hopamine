"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { ZimaChatDock } from "@/components/zima/chat/ZimaChatDock";
import { ZimaChatDockProvider } from "@/components/zima/chat/ZimaChatDockProvider";
import { HexLoadTransitionProvider } from "@/components/zima/hexload/HexLoadTransition";
import {
  isZimaAuthChromePath,
  isZimaChatsPath,
  isZimaProfilePath,
} from "@/lib/zima/routes";
import { ZimaAuthButtons } from "./ZimaAuthButtons";
import { ZimaMobileBottomNav, type ZimaMobileTab } from "./ZimaMobileBottomNav";
import { ZimaSearchChromeProvider } from "./ZimaSearchChromeContext";
import { useZimaMobileNavHrefs } from "./useZimaMobileNavHrefs";

function mobileTabForPath(pathname: string): ZimaMobileTab | null {
  if (isZimaAuthChromePath(pathname)) return null;
  if (isZimaChatsPath(pathname)) return "chats";
  if (isZimaProfilePath(pathname)) return "profile";
  return "explore";
}

export function ZimaAppChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const activeTab = mobileTabForPath(pathname);
  const { homeHref, chatsHref, profileHref } = useZimaMobileNavHrefs();

  return (
    <ZimaSearchChromeProvider>
      <ZimaChatDockProvider>
        <HexLoadTransitionProvider>
          <ZimaAuthButtons />
          {activeTab ? (
            <div className="flex min-h-dvh flex-col md:block">
              <div className="flex min-h-0 flex-1 flex-col md:block">{children}</div>
              <ZimaMobileBottomNav
                active={activeTab}
                homeHref={homeHref}
                chatsHref={chatsHref}
                profileHref={profileHref}
                placement="inline"
              />
            </div>
          ) : (
            children
          )}
          <ZimaChatDock />
        </HexLoadTransitionProvider>
      </ZimaChatDockProvider>
    </ZimaSearchChromeProvider>
  );
}
