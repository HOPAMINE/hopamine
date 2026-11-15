"use client";

import { useQuery } from "convex/react";
import Image from "next/image";
import { api } from "../../../convex/_generated/api";
import { jetbrainsMono, newsreader } from "../../../fonts";
import {
  profileArchetypes,
  profileFreeformSkills,
  profileSkills,
} from "../../../shared/zimaVocabulary";
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

function TagList({
  label,
  items,
}: {
  label: string;
  items: string[];
}) {
  return (
    <div className="space-y-1">
      <p
        className={`${jetbrainsMono.className} text-[11px] font-semibold uppercase tracking-wide text-neutral-500`}
      >
        {label}
      </p>
      {items.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {items.map((item) => (
            <li
              key={item}
              className={`${jetbrainsMono.className} rounded-full bg-white px-3 py-1 text-[12px] font-semibold uppercase tracking-wide text-neutral-800`}
            >
              {item}
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
  );
}

type ProfileProject = {
  _id: string;
  title: string;
  blurb: string;
  field: string;
  location?: string;
  liveUrl?: string;
  demoUrl?: string;
  repoUrl?: string;
  members: { name: string }[];
};

function ProjectsSection({ projects }: { projects: ProfileProject[] | undefined }) {
  return (
    <div className="space-y-2">
      <p
        className={`${jetbrainsMono.className} text-[11px] font-semibold uppercase tracking-wide text-neutral-500`}
      >
        Projects
      </p>
      {projects === undefined ? (
        <p
          className={`${jetbrainsMono.className} text-[14px] leading-relaxed text-neutral-500`}
        >
          Loading projects…
        </p>
      ) : projects.length === 0 ? (
        <p
          className={`${jetbrainsMono.className} text-[14px] leading-relaxed text-neutral-800`}
        >
          —
        </p>
      ) : (
        <ul className="space-y-2">
          {projects.map((project) => {
            const href =
              project.liveUrl || project.demoUrl || project.repoUrl || undefined;
            const memberNames = project.members
              .map((member) => member.name.trim())
              .filter(Boolean)
              .slice(0, 4);
            const content = (
              <>
                <div className="flex items-start justify-between gap-2">
                  <p
                    className={`${jetbrainsMono.className} text-[14px] font-semibold uppercase tracking-wide text-neutral-900`}
                  >
                    {project.title}
                  </p>
                  <span
                    className={`${jetbrainsMono.className} shrink-0 text-[11px] font-semibold uppercase tracking-wide text-neutral-500`}
                  >
                    {project.field}
                  </span>
                </div>
                {project.location?.trim() ? (
                  <p
                    className={`${jetbrainsMono.className} mt-1 text-[11px] font-semibold uppercase tracking-wide text-neutral-500`}
                  >
                    Based in {project.location.trim()}
                  </p>
                ) : null}
                {project.blurb.trim() ? (
                  <p
                    className={`${jetbrainsMono.className} mt-1 text-[13px] leading-relaxed text-neutral-700`}
                  >
                    {project.blurb}
                  </p>
                ) : null}
                {memberNames.length > 0 ? (
                  <p
                    className={`${jetbrainsMono.className} mt-1.5 text-[11px] uppercase tracking-wide text-neutral-500`}
                  >
                    With {memberNames.join(", ")}
                    {project.members.length > memberNames.length ? "…" : ""}
                  </p>
                ) : null}
              </>
            );

            return (
              <li key={project._id}>
                {href ? (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded-xl border border-neutral-200 bg-white px-4 py-3 transition-colors hover:border-[#00a6f3]"
                  >
                    {content}
                  </a>
                ) : (
                  <div className="rounded-xl border border-neutral-200 bg-white px-4 py-3">
                    {content}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

type ZimaProfileCardProps = {
  user: ZimaProfileData;
  onEdit: () => void;
};

export function ZimaProfileCard({ user, onEdit }: ZimaProfileCardProps) {
  const projects = useQuery(api.projects.listMine);

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
        <ProfileField label="Bio" value={user.bio} />
        <TagList
          label="Skills"
          items={profileSkills({
            archetypes: user.archetypes,
            skills: user.skills,
          })}
        />
        <TagList label="Archetypes" items={user.archetypes} />
        <ProjectsSection projects={projects} />
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
    skills: profileFreeformSkills(user),
  };
}
