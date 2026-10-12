"use client";

import { useClerk, useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { api } from "../../../convex/_generated/api";
import {
  getZimaAuthHref,
  getZimaPath,
  getZimaPostAuthRedirect,
  isZimaOnboardPath,
} from "@/lib/zima/routes";
import { jetbrainsMono } from "../../../fonts";
import { toZimaProfileData } from "./ZimaProfileCard";
import { ZimaProfileEditModal } from "./ZimaProfileEditModal";
import { useZimaChatDock } from "@/components/zima/chat/ZimaChatDockProvider";
import { useZimaSearchChrome } from "./ZimaSearchChromeContext";

const HOPAMINE_BLUE = "#00a6f3";

const navClass =
  "fixed right-[max(12px,env(safe-area-inset-right))] top-[max(12px,env(safe-area-inset-top))] z-30 flex items-center gap-1.5 md:right-[max(20px,env(safe-area-inset-right))] md:top-[max(20px,env(safe-area-inset-top))] md:gap-2";

const linkBase = `${jetbrainsMono.className} inline-flex items-center justify-center rounded-lg px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide transition-opacity hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00a6f3] md:rounded-xl md:px-3 md:py-2 md:text-[13.5px]`;

const menuItemClass = `${jetbrainsMono.className} block w-full px-3 py-2 text-left text-[13px] font-semibold uppercase tracking-wide text-neutral-800 transition-colors hover:bg-neutral-50`;

function displayCityName(location: string | undefined): string {
  const trimmed = location?.trim();
  if (!trimmed) return "NYC";
  if (/new york city/i.test(trimmed) || /\bnyc\b/i.test(trimmed)) {
    return "New York City";
  }
  const comma = trimmed.lastIndexOf(",");
  if (comma >= 0) {
    return trimmed.slice(comma + 1).trim() || trimmed;
  }
  return trimmed;
}

function ChatNavIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="square"
      strokeLinejoin="miter"
    >
      <path d="M4 5h16v11H7l-3 3V5z" />
    </svg>
  );
}

function ZimaChatNavLink() {
  const hostname =
    typeof window === "undefined" ? "" : window.location.hostname;
  const href = getZimaPath("chats", hostname);
  const { chatAvailable, openDock } = useZimaChatDock();

  return (
    <Link
      href={href}
      onClick={(event) => {
        if (!chatAvailable) return;
        if (!window.matchMedia("(min-width: 768px)").matches) return;
        event.preventDefault();
        openDock();
      }}
      aria-label="Messages"
      className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-full bg-neutral-100 transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00a6f3] md:inline-flex"
      style={{ color: HOPAMINE_BLUE }}
    >
      <ChatNavIcon />
    </Link>
  );
}

function ZimaSignedInUser() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const convexUser = useQuery(api.users.getCurrentUser);
  const [editOpen, setEditOpen] = useState(false);
  const hostname =
    typeof window === "undefined" ? "" : window.location.hostname;
  const displayName =
    convexUser?.name?.trim() ||
    user?.fullName?.trim() ||
    user?.firstName?.trim() ||
    user?.username?.trim() ||
    "Account";
  const location = displayCityName(convexUser?.location);
  const avatarUrl = convexUser?.avatarUrl || user?.imageUrl || "";
  const profileData = convexUser
    ? toZimaProfileData(convexUser)
    : user
      ? {
          name: user.fullName?.trim() || user.firstName?.trim() || "Account",
          username: user.username ?? undefined,
          avatarUrl: user.imageUrl ?? "",
          archetypes: [],
        }
      : null;

  const handleLogout = () => {
    void signOut({ redirectUrl: getZimaPostAuthRedirect(hostname) });
  };

  const openEdit = () => {
    setEditOpen(true);
  };

  return (
    <>
      <div className="group relative">
        <div
          className={`${jetbrainsMono.className} inline-flex h-14 items-center gap-3 rounded-full bg-neutral-100 pl-5 pr-2 text-neutral-900`}
        >
          <button
            type="button"
            aria-haspopup="menu"
            aria-label={`${displayName}, ${location} account menu`}
            className="flex min-w-0 max-w-[min(40vw,220px)] flex-col items-start justify-center py-1 text-left transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00a6f3]"
          >
            <span className="w-full truncate text-[14px] font-semibold uppercase tracking-wide">
              {displayName}
            </span>
            <span className="w-full truncate text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
              {location}
            </span>
          </button>
          <button
            type="button"
            onClick={openEdit}
            aria-label="Edit profile"
            className="flex h-11 w-11 shrink-0 items-center justify-center p-1 transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00a6f3]"
          >
            <span className="relative h-full w-full overflow-hidden rounded-full bg-neutral-200">
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt=""
                  fill
                  sizes="40px"
                  className="rounded-full object-cover"
                />
              ) : (
                <span
                  aria-hidden
                  className="flex h-full w-full items-center justify-center text-[13px] font-semibold uppercase text-neutral-600"
                >
                  {displayName.charAt(0)}
                </span>
              )}
            </span>
          </button>
        </div>

        <div
          role="menu"
          className="invisible absolute right-0 top-full z-20 min-w-[168px] pt-1 opacity-0 transition-[opacity,visibility] duration-150 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100"
        >
          <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
            <button
              type="button"
              role="menuitem"
              onClick={openEdit}
              className={menuItemClass}
            >
              View profile
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={handleLogout}
              className={`${menuItemClass} text-red-600 hover:bg-red-50 hover:text-red-700`}
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {editOpen && profileData ? (
        <ZimaProfileEditModal
          user={profileData}
          onClose={() => setEditOpen(false)}
        />
      ) : null}
    </>
  );
}

export function ZimaAuthButtons() {
  const { isLoaded, isSignedIn } = useUser();
  const { hideMobileTopProfile } = useZimaSearchChrome();
  const pathname = usePathname();

  if (!isLoaded || isZimaOnboardPath(pathname)) {
    return null;
  }

  if (isSignedIn) {
    return (
      <nav
        aria-label="Account"
        className={`${navClass} ${hideMobileTopProfile ? "max-md:hidden" : ""}`}
      >
        <ZimaChatNavLink />
        <ZimaSignedInUser />
      </nav>
    );
  }

  const hostname =
    typeof window === "undefined" ? "" : window.location.hostname;
  const zimaRedirect = getZimaPostAuthRedirect(hostname);
  const signUpHref = getZimaAuthHref("sign-up", zimaRedirect, hostname);
  const signInHref = getZimaAuthHref("sign-in", zimaRedirect, hostname);

  return (
    <nav
      aria-label="Account"
      className={`${navClass} ${hideMobileTopProfile ? "max-md:hidden" : ""}`}
    >
      <Link href={signInHref} className={`${linkBase} text-neutral-900`}>
        Login
      </Link>
      <Link
        href={signUpHref}
        className={`${linkBase} text-white`}
        style={{ backgroundColor: HOPAMINE_BLUE }}
      >
        <span className="md:hidden">Sign up</span>
        <span className="hidden md:inline">Create your account</span>
      </Link>
    </nav>
  );
}
