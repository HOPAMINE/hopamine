"use client";

import { type FormEvent } from "react";
import { jetbrainsMono } from "../../../fonts";
// import { ZimaSearchQuickPills } from "./ZimaSearchQuickPills";
import { ZimaSearchFilters } from "./ZimaSearchFilters";
import type { useZimaChat } from "./useZimaChat";
import type { useZimaSearch } from "./useZimaSearch";

const HOPAMINE_BLUE = "#00a6f3";

type Chat = ReturnType<typeof useZimaChat>;
type Search = ReturnType<typeof useZimaSearch>;

type Props = {
  chat: Chat;
  search: Search;
  onEnterChatMode: () => void;
  variant: "landing" | "compact" | "header";
  idSuffix?: string;
};

export function ZimaComposerFields({
  chat,
  search,
  onEnterChatMode,
  variant,
}: Props) {
  const { message, setMessage, inputRef, canSend, isLoading, submit } = chat;

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    void submit(event, onEnterChatMode);
  };

  const formShellClass =
    variant === "compact"
      ? "bg-neutral-200"
      : "border border-neutral-200 bg-white";

  const horizontalPad = variant === "landing" ? "px-4 md:px-0" : "";

  return (
    <div className={`w-full ${horizontalPad}`}>
      <form
        onSubmit={onSubmit}
        className={`relative m-0 flex h-14 w-full items-center gap-3 rounded-full pl-4 pr-3 shadow-none ${formShellClass}`}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 16 16"
          className="h-5 w-5 shrink-0 text-neutral-500"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="7" cy="7" r="4.25" />
          <path d="M10.5 10.5 14 14" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Find builders near you..."
          aria-label="Find builders near you"
          disabled={isLoading}
          className={`${jetbrainsMono.className} h-10 min-w-0 flex-1 appearance-none border-0 bg-transparent px-2 py-0 text-[15px] text-neutral-800 shadow-none outline-none placeholder:text-[15px] placeholder:text-neutral-400 disabled:opacity-60`}
        />
        <button
          type="submit"
          disabled={isLoading}
          aria-disabled={!canSend}
          aria-label="Send"
          className="relative z-10 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
          style={{ backgroundColor: HOPAMINE_BLUE }}
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 16 16"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="square"
            strokeLinejoin="miter"
          >
            <path d="M8 13V3M3.5 7.5 8 3l4.5 4.5" />
          </svg>
        </button>
      </form>
      {/* {variant === "landing" || variant === "header" ? (
        <ZimaSearchQuickPills
          chat={chat}
          onEnterChatMode={onEnterChatMode}
          variant={variant === "header" ? "header" : "landing"}
        />
      ) : null} */}
      <ZimaSearchFilters
        className="mt-2"
        filters={search.filters}
        onFiltersChange={search.setFilters}
      />
    </div>
  );
}
