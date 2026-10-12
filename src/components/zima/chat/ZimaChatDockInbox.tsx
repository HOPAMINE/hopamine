"use client";

import Image from "next/image";
import { jetbrainsMono, newsreader } from "../../../../fonts";
import type { ZimaConversation } from "@/lib/zima/zimaChats";

const HOPAMINE_BLUE = "#00a6f3";

type Props = {
  conversations: ZimaConversation[];
  loadingConversations?: boolean;
  selectedConversationId: string | null;
  onSelectConversation: (conversationId: string) => void;
  /** Dock compact rows vs full-width chats page cards. */
  variant?: "dock" | "page";
};

export function ZimaChatDockInbox({
  conversations,
  loadingConversations = false,
  selectedConversationId,
  onSelectConversation,
  variant = "dock",
}: Props) {
  const isPage = variant === "page";

  return (
    <ul
      aria-label="Conversations"
      className={
        isPage
          ? "flex flex-col md:gap-3"
          : "flex min-h-0 flex-1 flex-col overflow-y-auto"
      }
    >
      {loadingConversations ? (
        <li
          className={`${jetbrainsMono.className} ${isPage ? "py-4 text-center text-[14px]" : "px-3 py-3 text-[10px] font-semibold uppercase tracking-wide"} text-neutral-400`}
        >
          Loading
        </li>
      ) : null}
      {!loadingConversations && conversations.length === 0 && !isPage ? (
        <li className={`${jetbrainsMono.className} px-3 py-3 text-[10px] font-semibold uppercase tracking-wide text-neutral-400`}>
          No conversations yet. Search a builder below to start one.
        </li>
      ) : null}
      {conversations.map((conversation) => {
        const isSelected = conversation.id === selectedConversationId;
        const unreadCount = conversation.unreadCount ?? 0;
        return (
          <li
            key={conversation.id}
            className={
              isPage
                ? "border-b border-neutral-200 last:border-b-0 md:border-b-0"
                : undefined
            }
          >
            <button
              type="button"
              onClick={() => onSelectConversation(conversation.id)}
              aria-current={isSelected ? "true" : undefined}
              className={
                isPage
                  ? "flex w-full gap-3 p-3 text-left transition-colors hover:bg-neutral-50 md:rounded-2xl md:border md:border-neutral-200 md:bg-neutral-100 md:hover:bg-neutral-200/80"
                  : `flex w-full gap-2.5 p-2.5 text-left transition-colors ${
                      isSelected
                        ? "bg-[#d6effc]"
                        : "bg-neutral-100 hover:bg-neutral-200/80"
                    }`
              }
            >
              <span
                className={`relative shrink-0 overflow-hidden rounded-full bg-neutral-200 ${
                  isPage ? "h-14 w-14" : "h-12 w-12"
                }`}
              >
                <Image
                  src={conversation.avatarUrl}
                  alt=""
                  fill
                  sizes={isPage ? "56px" : "48px"}
                  className="object-cover"
                  style={{ imageRendering: "pixelated" }}
                />
                {conversation.isOnline ? (
                  <span
                    aria-label="Online"
                    className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white"
                  />
                ) : null}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-start justify-between gap-2">
                  <span
                    className={`${newsreader.className} truncate leading-snug text-neutral-900 ${
                      isPage ? "text-[1.15rem]" : "text-[15px]"
                    }`}
                  >
                    {conversation.participantName}
                  </span>
                  <span
                    className={`${jetbrainsMono.className} shrink-0 font-semibold uppercase tracking-wide text-neutral-500 ${
                      isPage
                        ? "text-[10px]"
                        : "text-[9px] lowercase tracking-wide"
                    }`}
                  >
                    {conversation.lastMessageAt}
                  </span>
                </span>
                <span
                  className={`${jetbrainsMono.className} mt-0.5 block font-semibold uppercase tracking-wide text-neutral-600 ${
                    isPage
                      ? "text-[10px]"
                      : "truncate text-[9px] lowercase text-neutral-500"
                  }`}
                >
                  {conversation.participantTagline}
                </span>
                <span
                  className={`${jetbrainsMono.className} mt-1 text-neutral-700 ${
                    isPage
                      ? "line-clamp-2 text-[12px] leading-relaxed"
                      : "mt-0.5 flex min-w-0 flex-1 items-center gap-2 truncate text-[11px] leading-snug"
                  }`}
                >
                  {isPage ? (
                    conversation.lastMessage
                  ) : (
                    <>
                      <span className="min-w-0 flex-1 truncate">
                        {conversation.lastMessage}
                      </span>
                      {unreadCount > 0 ? (
                        <span
                          className={`${jetbrainsMono.className} flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 text-[10px] font-semibold text-white`}
                          style={{ backgroundColor: HOPAMINE_BLUE }}
                          aria-label={`${unreadCount} unread`}
                        >
                          {unreadCount}
                        </span>
                      ) : null}
                    </>
                  )}
                </span>
              </span>
              {isPage && unreadCount > 0 ? (
                <span
                  className={`${jetbrainsMono.className} flex h-6 min-w-6 shrink-0 items-center justify-center self-center px-1.5 text-[11px] font-semibold text-white`}
                  style={{ backgroundColor: HOPAMINE_BLUE }}
                  aria-label={`${unreadCount} unread`}
                >
                  {unreadCount}
                </span>
              ) : null}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
