"use client";

import type { ZimaSearchResult } from "@/lib/zima/searchResults";
import { newsreader } from "../../../fonts";
import { ZimaComposer } from "./ZimaComposer";
import { ZimaMakeathonBanner } from "./ZimaMakeathonBanner";
import { ZimaMobileSearch } from "./ZimaMobileSearch";
import { ZimaSearchDesktop } from "./ZimaSearchDesktop";
import { ZIMA_LANDING_SEARCH_WIDTH } from "./ZimaSearchHeader";
import { useZimaChat } from "./useZimaChat";
import { useZimaSearch } from "./useZimaSearch";
import { useIsMdUp } from "./useIsMdUp";

type ZimaShellProps = {
  isChatMode: boolean;
  onChatModeChange: (isChatMode: boolean) => void;
  profiles: ZimaSearchResult[];
};

export function ZimaShell({
  isChatMode,
  onChatModeChange,
  profiles,
}: ZimaShellProps) {
  const chat = useZimaChat(isChatMode, { resultsOnly: true });
  const search = useZimaSearch(chat);
  const isMdUp = useIsMdUp();
  const enterChat = () => onChatModeChange(true);

  if (isChatMode) {
    if (isMdUp) {
      return (
        <ZimaSearchDesktop
          chat={chat}
          search={search}
          profiles={profiles}
          onFirstSend={enterChat}
        />
      );
    }
    return (
      <ZimaMobileSearch
        chat={chat}
        search={search}
        profiles={profiles}
        onFirstSend={enterChat}
      />
    );
  }

  return (
    <div className="relative z-10 flex h-full min-h-0 flex-1 flex-col md:min-h-dvh">
      {/* Mobile: search at top */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:hidden">
        <div
          className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto px-6 pt-[max(72px,env(safe-area-inset-top))]"
        >
          <div
            className={`flex w-full flex-col items-center gap-6 ${ZIMA_LANDING_SEARCH_WIDTH}`}
          >
            <h1
              className={`${newsreader.className} w-full text-balance text-center text-[28px] font-normal leading-[1.12] tracking-[-0.02em] text-[#00a6f3]`}
            >
              Where future builders in your city meet.
            </h1>
            <ZimaComposer
              isChatMode={isChatMode}
              onEnterChatMode={enterChat}
              chat={chat}
              search={search}
            />
          </div>
        </div>
      </div>

      {/* Desktop: centered landing */}
      <div className="hidden min-h-dvh flex-col md:flex">
        <div
          className="flex flex-1 flex-col items-center justify-center gap-8 px-6 pb-8 pt-[max(80px,env(safe-area-inset-top))]"
        >
          <div
            className={`flex w-full flex-col items-center gap-8 ${ZIMA_LANDING_SEARCH_WIDTH}`}
          >
            <h1
              className={`${newsreader.className} w-full text-balance text-center text-[32px] font-normal leading-[1.12] tracking-[-0.02em] text-[#00a6f3] sm:text-[40px]`}
            >
              Where future builders in your city meet.
            </h1>
            <ZimaComposer
              isChatMode={isChatMode}
              onEnterChatMode={enterChat}
              chat={chat}
              search={search}
            />
          </div>
        </div>
        <div className="flex w-full justify-center px-6">
          <div className={`w-full ${ZIMA_LANDING_SEARCH_WIDTH}`}>
            <div className="mx-auto w-[75%]">
              <ZimaMakeathonBanner />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
