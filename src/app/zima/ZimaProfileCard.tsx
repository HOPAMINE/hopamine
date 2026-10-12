"use client";

import Image from "next/image";
import { jetbrainsMono, newsreader } from "../../../fonts";
import { profileArchetypes } from "../../../shared/zimaVocabulary";
import type { ZimaProfileData } from "./ZimaProfileEditModal";

const HOPAMINE_BLUE = "#00a6f3";
const AVATAR_SIZE = 96;

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.charAt(0).toUpperCase();
  return `${parts[0]!.charAt(0)}${parts[parts.length - 1]!.charAt(0)}`.toUpperCase();
}

function ProfileField({
  label,
  value,
}: {
  label: string;
  value?: string;
}) {
  return (
    <div className="space-y-1">
      <p
        className={`${jetbrainsMono.className} text-[11px] font-semibold uppercase tracking-wide text-neutral-500`}
      >
        {label}
      </p>
      <p
        className={`${jetbrainsMono.className} text-[14px] leading-relaxed text-neutral-800`}
      >
        {value?.trim() ? value : "—"}
      </p>
    </div>
  );
}

type ZimaProfileCardProps = {
  user: ZimaProfileData;
  onEdit: () => void;
};

export function ZimaProfileCard({ user, onEdit }: ZimaProfileCardProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-100 p-6">
      <div className="flex items-start gap-4 text-left">
        <div
          className="relative shrink-0 overflow-hidden rounded-full border border-neutral-300 bg-neutral-200"
          style={{ width: AVATAR_SIZE, height: AVATAR_SIZE }}
        >
          {user.avatarUrl ? (
            <Image
              src={user.avatarUrl}
              alt=""
              width={AVATAR_SIZE}
              height={AVATAR_SIZE}
              className="h-full w-full object-cover"
            />
          ) : (
            <span
              className={`${jetbrainsMono.className} flex h-full w-full items-center justify-center text-2xl font-semibold text-neutral-600`}
            >
              {getInitials(user.name)}
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h2
            className={`${newsreader.className} text-[28px] font-normal leading-tight tracking-[-0.02em] text-neutral-900`}
          >
            {user.name}
          </h2>
          {user.username ? (
            <p
              className={`${jetbrainsMono.className} mt-1 text-[13px] text-neutral-500`}
            >
              @{user.username}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-6 space-y-4 border-t border-neutral-200 pt-6">
        <ProfileField label="Location" value={user.location} />
        <div className="space-y-1">
          <p
            className={`${jetbrainsMono.className} text-[11px] font-semibold uppercase tracking-wide text-neutral-500`}
          >
            Archetypes
          </p>
          {user.archetypes.length > 0 ? (
            <ul className="flex flex-wrap gap-2">
              {user.archetypes.map((archetype) => (
                <li
                  key={archetype}
                  className={`${jetbrainsMono.className} rounded-full bg-white px-3 py-1 text-[12px] font-semibold uppercase tracking-wide text-neutral-800`}
                >
                  {archetype}
                </li>
              ))}
            </ul>
          ) : (
            <p
              className={`${jetbrainsMono.className} text-[14px] leading-relaxed text-neutral-800`}
            >
              —
            </p>
          )}
        </div>
        <ProfileField label="Bio" value={user.bio} />
      </div>

      <button
        type="button"
        onClick={onEdit}
        className={`${jetbrainsMono.className} mt-6 w-full rounded-xl px-4 py-3 text-[13.5px] font-semibold uppercase tracking-wide text-white transition-opacity hover:opacity-90`}
        style={{ backgroundColor: HOPAMINE_BLUE }}
      >
        Edit profile
      </button>
    </div>
  );
}

export function toZimaProfileData(user: {
  name: string;
  username?: string;
  avatarUrl: string;
  bio?: string;
  location?: string;
  archetypes?: string[];
  skills?: string[];
}): ZimaProfileData {
  return {
    name: user.name,
    username: user.username,
    avatarUrl: user.avatarUrl,
    bio: user.bio,
    location: user.location,
    archetypes: profileArchetypes(user),
  };
}
