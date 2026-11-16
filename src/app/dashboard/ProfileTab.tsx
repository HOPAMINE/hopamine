"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { HACKATHON_FIELDS, getHackathonProjectByIndex, type HackathonField } from "@/lib/hackathonDirectory";
import { primaryProjectLink } from "@/lib/projectUrls";
import { getPublicProfileUrlForUser } from "@/lib/profileUrls";
import { projectSeekingLabels } from "../../../shared/projectSeeking";
import { AddProjectCard } from "../../../components/projects/AddProjectCard";
import { EditProjectForm } from "../../../components/projects/EditProjectForm";
import { JoinProjectForm } from "../../../components/projects/JoinProjectForm";
import {
  ClaimedHackathonProjectActions,
  ProjectActions,
} from "../../../components/projects/ProjectActions";
import { ProjectCard } from "../../../components/projects/ProjectCard";
import { ProjectSectionHeaderActions } from "../../../components/projects/ProjectSectionHeaderActions";
import {
  dashboardProjectCardFootprintClassName,
  projectCardAddReferenceClassName,
} from "../../../components/projects/projectCardStyles";
import { ClaimParticipationCard } from "../../../components/claim/ClaimParticipationCard";
import {
  PARTICIPATION_CARD_TOTAL_HEIGHT,
  PARTICIPATION_CARD_WIDTH,
} from "../../../components/claim/participationCardStyles";
import { DitheredAvatarImage } from "../../../components/avatar/DitheredAvatarImage";
import { ProfileAvatarUpload } from "../../../components/profile/ProfileAvatarUpload";
import { robotoFlex, robotoMono } from "../../../fonts";

// ─── Constants ────────────────────────────────────────────────────────────────

const AV_SIZE = 63;
const ACCENT = "#00a6f3";

// The blue page gradient that the panels float on top of.
const PAGE_GRADIENT =
  "linear-gradient(to bottom right,#00a6f3 0%,#00a6f3 35%,#cdeefc 62%,#f5fafc 82%,#fefefe 100%)";

type ConvexUser = NonNullable<ReturnType<typeof useQuery<typeof api.users.getCurrentUser>>>;
export type ProfileUser = {
  _id: Id<"users">;
  name: string;
  username?: string;
  avatarUrl: string;
  bio?: string;
  location?: string;
  skills?: string[];
  interests?: string[];
  vision?: string;
  learning?: string;
  socialLinks?: Record<string, string>;
};
type MyProject = NonNullable<ReturnType<typeof useQuery<typeof api.projects.listMine>>>[number];
type PublicProject = NonNullable<ReturnType<typeof useQuery<typeof api.projects.listForUser>>>[number];
type ProfileProject = MyProject | PublicProject;
type MyBadge = NonNullable<ReturnType<typeof useQuery<typeof api.badges.listMine>>>[number];

type ClaimedDisplayProject = {
  kind: "claimed";
  id: string;
  field: HackathonField;
  title: string;
  blurb: string;
  builder: string;
  externalHref?: string;
};

type CommunityDisplayProject = {
  kind: "community";
  project: ProfileProject;
};

type DisplayProjectItem = ClaimedDisplayProject | CommunityDisplayProject;

function buildDisplayProjects(
  projects: ProfileProject[] | undefined,
  badges: MyBadge[] | undefined,
  builderName: string,
  hideClaimedHackathonProject = false,
): DisplayProjectItem[] {
  const items: DisplayProjectItem[] = [];
  const hackathonBadge = badges?.find(
    (badge) => badge.kind === "green-hackathon-builder" && badge.projectTitle,
  );

  if (hackathonBadge?.projectTitle && !hideClaimedHackathonProject) {
    const directoryProject =
      hackathonBadge.projectIndex !== undefined
        ? getHackathonProjectByIndex(hackathonBadge.projectIndex)
        : null;

    items.push({
      kind: "claimed",
      id: "claimed-hackathon-project",
      field: hackathonBadge.projectField ?? directoryProject?.field ?? "Other",
      title: hackathonBadge.projectTitle,
      blurb: hackathonBadge.projectBlurb ?? directoryProject?.blurb ?? "",
      builder: builderName,
      externalHref: directoryProject?.liveUrl ?? directoryProject?.demoUrl,
    });
  }

  if (projects) {
    for (const project of projects) {
      items.push({ kind: "community", project });
    }
  }

  return items;
}

// ─── Small utilities ──────────────────────────────────────────────────────────

function formatMemberNames(members: MyProject["members"], fallbackName: string): string {
  if (members.length === 0) return fallbackName;
  return members.map((member) => member.name).join(", ");
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function getFirstName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return name;
  return trimmed.split(/\s+/)[0] ?? trimmed;
}

// ─── Hover-float animations (preserved from the original profile) ──────────────

const FLOAT_UP = 15;
const FLOAT_DOWN = 4;
const FLOAT_AMPLITUDE = (FLOAT_UP + FLOAT_DOWN) / 2;
const FLOAT_MID = FLOAT_DOWN - FLOAT_AMPLITUDE;
const FLOAT_PERIOD = 2800;
// Phase offset so the animation starts at y=0 moving upward
const FLOAT_PHASE = Math.PI - Math.asin(-FLOAT_MID / FLOAT_AMPLITUDE);

function FloatingName({ name }: { name: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const rafRef = useRef<number>(0);

  function startFloat() {
    cancelAnimationFrame(rafRef.current);
    if (ref.current) ref.current.style.transition = "none";
    const startTime = performance.now();

    function tick(now: number) {
      if (ref.current) {
        const t = ((now - startTime) / FLOAT_PERIOD) * (2 * Math.PI) + FLOAT_PHASE;
        ref.current.style.transform = `translateY(${FLOAT_MID + FLOAT_AMPLITUDE * Math.sin(t)}px)`;
      }
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
  }

  function stopFloat() {
    cancelAnimationFrame(rafRef.current);
    if (ref.current) {
      ref.current.style.transition = "transform 0.5s ease-out";
      ref.current.style.transform = "translateY(0)";
    }
  }

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  return (
    <span
      ref={ref}
      className="text-[#00a6f3] inline-block"
      onMouseEnter={startFloat}
      onMouseLeave={stopFloat}
    >
      {name}
    </span>
  );
}

const HDR_UP = 7;
const HDR_DOWN = 2;
const HDR_AMPLITUDE = (HDR_UP + HDR_DOWN) / 2;
const HDR_MID = HDR_DOWN - HDR_AMPLITUDE;
const HDR_PERIOD = 2800;
const HDR_PHASE = Math.PI - Math.asin(-HDR_MID / HDR_AMPLITUDE);

function FloatingHeader({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLSpanElement>(null);
  const rafRef = useRef<number>(0);

  function startFloat() {
    cancelAnimationFrame(rafRef.current);
    if (ref.current) {
      ref.current.style.transition = "color 0.3s ease";
      ref.current.style.color = ACCENT;
    }
    const startTime = performance.now();
    function tick(now: number) {
      if (ref.current) {
        const t = ((now - startTime) / HDR_PERIOD) * (2 * Math.PI) + HDR_PHASE;
        ref.current.style.transform = `translateY(${HDR_MID + HDR_AMPLITUDE * Math.sin(t)}px)`;
      }
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
  }

  function stopFloat() {
    cancelAnimationFrame(rafRef.current);
    if (ref.current) {
      ref.current.style.transition = "transform 0.5s ease-out, color 0.5s ease";
      ref.current.style.transform = "translateY(0)";
      ref.current.style.color = "";
    }
  }

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  return (
    <span
      ref={ref}
      className="inline-block cursor-default text-neutral-900"
      onMouseEnter={startFloat}
      onMouseLeave={stopFloat}
    >
      {children}
    </span>
  );
}

// ─── Inline editing (preserved from the original profile) ──────────────────────

function InlineEdit({
  value,
  onSave,
  placeholder,
  multiline = true,
  displayContent,
}: {
  value: string;
  onSave: (v: string) => Promise<unknown>;
  placeholder: string;
  multiline?: boolean;
  displayContent?: React.ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const skipBlurSaveRef = useRef(false);

  async function confirmEdit() {
    if (draft === value) {
      setEditing(false);
      return;
    }
    try {
      await onSave(draft);
    } finally {
      setEditing(false);
    }
  }

  async function handleBlur() {
    if (skipBlurSaveRef.current) {
      skipBlurSaveRef.current = false;
      return;
    }
    await confirmEdit();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) {
    if (e.key === "Escape") {
      e.preventDefault();
      setDraft(value);
      setEditing(false);
      return;
    }
    if (e.key === "Enter" && (!multiline || !e.shiftKey)) {
      e.preventDefault();
      skipBlurSaveRef.current = true;
      void confirmEdit();
    }
  }

  if (editing) {
    const cls =
      "w-full rounded-2xl font-mono text-sm text-neutral-800 border border-[#00a6f3]/60 p-3 focus:outline-none focus:border-[#00a6f3] focus:ring-2 focus:ring-[#00a6f3]/20 bg-white leading-relaxed resize-none overflow-hidden";
    function autoSize(el: HTMLTextAreaElement | null) {
      if (!el) return;
      el.style.height = "auto";
      el.style.height = el.scrollHeight + "px";
    }
    return multiline ? (
      <textarea
        autoFocus
        className={cls}
        value={draft}
        ref={autoSize}
        onChange={(e) => {
          setDraft(e.target.value);
          autoSize(e.target);
        }}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
      />
    ) : (
      <input
        autoFocus
        type="text"
        className={`${cls} py-1.5`}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
      />
    );
  }

  return (
    <button
      type="button"
      className="group/edit w-full cursor-text rounded-xl border border-transparent px-2 py-1 text-left transition-all hover:border-[#00a6f3]/50 hover:bg-[#00a6f3]/[0.04] focus-visible:border-[#00a6f3]/60 focus-visible:bg-[#00a6f3]/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00a6f3]/20"
      onClick={() => {
        setDraft(value);
        setEditing(true);
      }}
    >
      {displayContent ?? (value ? (
        <p className="font-mono text-[14px] text-neutral-700 leading-snug">{value}</p>
      ) : (
        <p className="font-mono text-[14px] text-neutral-300 italic leading-snug">{placeholder}</p>
      ))}
    </button>
  );
}

// ─── Tag list editor (skills, interests) ─────────────────────────────────────

const tagInputClass =
  "min-w-0 flex-1 rounded-[8px] border border-[#00a6f3]/40 bg-white px-3 py-2 font-mono text-sm text-neutral-800 placeholder:text-neutral-300 focus:border-[#00a6f3] focus:outline-none disabled:opacity-60";

const tagInputEmptyClass =
  "min-w-0 flex-1 rounded-[8px] border border-dashed border-[#00a6f3]/50 bg-white px-3 py-2 font-mono text-sm text-neutral-800 placeholder:text-neutral-400 focus:border-[#00a6f3] focus:outline-none disabled:opacity-60";

const tagPillClass =
  "inline-flex items-center gap-1.5 rounded-[8px] border border-[#00a6f3]/40 bg-white py-1.5 pl-3 pr-2 font-mono text-[13px] uppercase tracking-wide text-neutral-800";

function parseLearningItems(learning: string | undefined): string[] {
  if (!learning?.trim()) return [];
  return learning
    .split(/,\s*/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatLearningItems(items: string[]): string | undefined {
  if (items.length === 0) return undefined;
  return items.join(", ");
}

function TagListEditor({
  items,
  onChange,
  placeholder,
  addLabel,
}: {
  items: string[];
  onChange: (items: string[]) => Promise<void>;
  placeholder: string;
  addLabel: string;
}) {
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [showInput, setShowInput] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showInput) {
      inputRef.current?.focus();
    }
  }, [showInput]);

  async function persist(next: string[]) {
    setSaving(true);
    try {
      await onChange(next);
    } finally {
      setSaving(false);
    }
  }

  async function commitDraft(closeAfter: boolean) {
    const trimmed = draft.trim();
    if (!trimmed) {
      if (closeAfter) {
        setDraft("");
        setShowInput(false);
      }
      return;
    }
    if (saving) return;

    const exists = items.some((item) => item.toLowerCase() === trimmed.toLowerCase());
    if (exists) {
      setDraft("");
      if (closeAfter) {
        setShowInput(false);
      }
      return;
    }

    await persist([...items, trimmed]);
    setDraft("");
    if (closeAfter) {
      setShowInput(false);
    }
  }

  async function removeItem(index: number) {
    if (saving) return;
    await persist(items.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-2">
      {items.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {items.map((item, index) => (
            <span key={`${item}-${index}`} className={tagPillClass}>
              {item}
              <button
                type="button"
                onClick={() => void removeItem(index)}
                disabled={saving}
                aria-label={`Remove ${item}`}
                className="inline-flex size-4 items-center justify-center rounded-full text-[11px] leading-none text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 disabled:opacity-50"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      ) : null}

      {showInput ? (
        <div className="flex items-stretch gap-2">
          <input
            ref={inputRef}
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void commitDraft(true);
              }
              if (e.key === "Escape") {
                e.preventDefault();
                setDraft("");
                setShowInput(false);
              }
            }}
            onBlur={() => {
              if (!draft.trim()) {
                setShowInput(false);
              }
            }}
            placeholder={placeholder}
            disabled={saving}
            className={items.length === 0 ? tagInputEmptyClass : tagInputClass}
          />
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => void commitDraft(true)}
            disabled={!draft.trim() || saving}
            aria-label={addLabel}
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-[8px] bg-[#00a6f3] font-mono text-lg font-semibold leading-none text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            +
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowInput(true)}
          disabled={saving}
          className="font-mono text-[13px] font-semibold uppercase tracking-wide text-[#00a6f3] transition-opacity hover:opacity-80 disabled:opacity-50"
        >
          {addLabel}
        </button>
      )}
    </div>
  );
}

function ReadOnlyText({ value }: { value?: string }) {
  if (!value?.trim()) return null;
  return <p className="font-mono text-[14px] leading-snug text-neutral-700">{value}</p>;
}

function ReadOnlyTags({ items }: { items: string[] }) {
  if (items.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span key={item} className={tagPillClass}>
          {item}
        </span>
      ))}
    </div>
  );
}

// ─── Left panel: profile info ──────────────────────────────────────────────────

const logoutButtonClass = `${robotoMono.className} inline-flex w-full touch-manipulation items-center justify-center rounded-full border border-accent-navbar/20 bg-accent-navbar px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-white transition-colors hover:bg-white hover:text-accent-navbar focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-navbar`;

function LeftProfilePanel({
  user,
  readOnly = false,
  showFirstNameOnCard = false,
}: {
  user: ProfileUser;
  readOnly?: boolean;
  showFirstNameOnCard?: boolean;
}) {
  const { signOut } = useClerk();
  const updateProfile = useMutation(api.users.updateProfile);
  const initials = getInitials(user.name);

  return (
    <aside className="flex w-full shrink-0 flex-col gap-4 overflow-hidden rounded-[28px] bg-white px-5 py-5 shadow-[0_4px_20px_rgba(0,0,0,0.08)] lg:w-[387px] lg:rounded-[40px] lg:px-6">
      {/* Identity row: avatar + name + location */}
      <div className="flex items-start gap-[15px]">
        {readOnly ? (
          <div
            className="shrink-0 overflow-hidden rounded-full border-2 border-white bg-[#0090d4]"
            style={{ width: AV_SIZE, height: AV_SIZE }}
          >
            {user.avatarUrl ? (
              <DitheredAvatarImage
                src={user.avatarUrl}
                size={AV_SIZE}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center font-serif text-xl font-semibold text-white">
                {initials}
              </span>
            )}
          </div>
        ) : (
          <ProfileAvatarUpload
            avatarUrl={user.avatarUrl}
            name={user.name}
            size={AV_SIZE}
            variant="light"
            controls="none"
          />
        )}
        <div className="min-w-0 flex-1 pt-0.5">
          <h1 className={`${robotoFlex.className} text-[36px] font-semibold leading-[1.05] tracking-[-0.02em] text-neutral-900`}>
            <FloatingName name={showFirstNameOnCard ? getFirstName(user.name) : user.name} />
          </h1>
          {user.location && (
            <p className="font-mono font-light text-[16px] uppercase tracking-wide text-neutral-500 truncate">
              {user.location}
            </p>
          )}
        </div>
      </div>

      {/* Bio */}
      <section>
        <h2 className={`${robotoFlex.className} text-[24px] font-semibold mb-1 tracking-[-0.02em]`}>
          <FloatingHeader>Bio</FloatingHeader>
        </h2>
        {readOnly ? (
          <ReadOnlyText value={user.bio} />
        ) : (
          <InlineEdit
            value={user.bio ?? ""}
            onSave={(v) => updateProfile({ bio: v || undefined })}
            placeholder="A short intro about you…"
          />
        )}
      </section>

      {/* Learning */}
      <section>
        <h2 className={`${robotoFlex.className} text-[24px] font-semibold mb-1 tracking-[-0.02em]`}>
          <FloatingHeader>Learning</FloatingHeader>
        </h2>
        {readOnly ? (
          <ReadOnlyTags items={parseLearningItems(user.learning)} />
        ) : (
          <TagListEditor
            items={parseLearningItems(user.learning)}
            placeholder="Climate policy, Rust, product strategy…"
            addLabel="Add learning"
            onChange={async (items) => {
              await updateProfile({ learning: formatLearningItems(items) });
            }}
          />
        )}
      </section>

      {/* Skills */}
      <section>
        <h2 className={`${robotoFlex.className} text-[24px] font-semibold mb-1 tracking-[-0.02em]`}>
          <FloatingHeader>Skills</FloatingHeader>
        </h2>
        {readOnly ? (
          <ReadOnlyTags items={user.skills ?? []} />
        ) : (
          <TagListEditor
            items={user.skills ?? []}
            placeholder="React, TypeScript, Product design…"
            addLabel="Add skills"
            onChange={async (skills) => {
              await updateProfile({ skills: skills.length > 0 ? skills : undefined });
            }}
          />
        )}
      </section>

      {/* Interests */}
      <section>
        <h2 className={`${robotoFlex.className} text-[24px] font-semibold mb-1 tracking-[-0.02em]`}>
          <FloatingHeader>Interests</FloatingHeader>
        </h2>
        {readOnly ? (
          <ReadOnlyTags items={user.interests ?? []} />
        ) : (
          <TagListEditor
            items={user.interests ?? []}
            placeholder="Climate tech, urban farming…"
            addLabel="Add interests"
            onChange={async (interests) => {
              await updateProfile({ interests: interests.length > 0 ? interests : undefined });
            }}
          />
        )}
      </section>

      {/* Discord */}
      <section>
        <h2 className={`${robotoFlex.className} text-[24px] font-semibold mb-1 tracking-[-0.02em]`}>
          <FloatingHeader>Discord</FloatingHeader>
        </h2>
        {readOnly ? (
          <ReadOnlyText value={user.socialLinks?.discord} />
        ) : (
          <InlineEdit
            value={user.socialLinks?.discord ?? ""}
            onSave={(v) => updateProfile({ discord: v || undefined })}
            placeholder="yourname"
            multiline={false}
          />
        )}
      </section>

      {/* Vision */}
      <section>
        <h2 className={`${robotoFlex.className} text-[24px] font-semibold mb-1 tracking-[-0.02em]`}>
          <FloatingHeader>Vision</FloatingHeader>
        </h2>
        {readOnly ? (
          <ReadOnlyText value={user.vision} />
        ) : (
          <InlineEdit
            value={user.vision ?? ""}
            onSave={(v) => updateProfile({ vision: v || undefined })}
            placeholder="Your north star…"
          />
        )}
      </section>

      {!readOnly ? (
        <button
          type="button"
          onClick={() => {
            void signOut({ redirectUrl: "/" });
          }}
          className={logoutButtonClass}
        >
          Logout
        </button>
      ) : null}
    </aside>
  );
}

// ─── Project modals ────────────────────────────────────────────────────────────

function JoinProjectModal({
  onClose,
  onJoined,
}: {
  onClose: () => void;
  onJoined: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-lg rounded-[24px] bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Join project with code"
      >
        <h3 className={`${robotoMono.className} mb-5 text-sm font-semibold uppercase tracking-wide text-neutral-500`}>
          Join with code
        </h3>
        <JoinProjectForm variant="light" onCancel={onClose} onJoined={onJoined} />
      </div>
    </div>
  );
}

function EditProjectModal({
  project,
  onClose,
  onSaved,
}: {
  project: MyProject;
  onClose: () => void;
  onSaved: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-2xl rounded-[24px] bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Edit ${project.title}`}
      >
        <h3 className={`${robotoMono.className} mb-5 text-sm font-semibold uppercase tracking-wide text-neutral-500`}>
          Edit project
        </h3>
        <EditProjectForm
          variant="light"
          projectId={project._id}
          initialField={project.field}
          initialTitle={project.title}
          initialBlurb={project.blurb}
          initialLocation={project.location ?? ""}
          initialLiveUrl={project.liveUrl ?? ""}
          initialJoinCode={project.joinCode ?? ""}
          initialLookingForContributors={project.lookingForContributors === true}
          initialLookingToHire={project.lookingToHire === true}
          onCancel={onClose}
          onSaved={onSaved}
        />
      </div>
    </div>
  );
}

// The real badge cards are designed at ~391px wide; in the grid we render them
// as smaller thumbnails by scaling the whole card down (preserves proportions).
const BADGE_SCALE = 0.5;
const BADGE_THUMB_WIDTH = PARTICIPATION_CARD_WIDTH * BADGE_SCALE;
const BADGE_THUMB_HEIGHT = PARTICIPATION_CARD_TOTAL_HEIGHT * BADGE_SCALE;

// Scales a full-size badge card down to a thumbnail. A CSS transform doesn't
// affect layout box size, so we measure the card's real (untransformed) height
// and size the clipping box from it — otherwise a too-short estimate crops the
// bottom of the card.
function ScaledBadgeThumb({ children }: { children: React.ReactNode }) {
  const innerRef = useRef<HTMLDivElement>(null);
  const [naturalHeight, setNaturalHeight] = useState(PARTICIPATION_CARD_TOTAL_HEIGHT);

  useEffect(() => {
    if (innerRef.current) {
      setNaturalHeight(innerRef.current.offsetHeight);
    }
  }, [children]);

  return (
    <div
      className="shrink-0 overflow-hidden"
      style={{ width: BADGE_THUMB_WIDTH, height: naturalHeight * BADGE_SCALE }}
    >
      <div
        ref={innerRef}
        style={{
          width: PARTICIPATION_CARD_WIDTH,
          transform: `scale(${BADGE_SCALE})`,
          transformOrigin: "top left",
        }}
      >
        {children}
      </div>
    </div>
  );
}

// Each badge type renders its own designed card, selected off `badge.kind`.
function BadgeCard({ badge, siteOrigin }: { badge: MyBadge; siteOrigin: string }) {
  switch (badge.kind) {
    case "green-hackathon-builder": {
      const profileUrl = siteOrigin
        ? getPublicProfileUrlForUser(siteOrigin, {
            _id: badge.userId,
            username: badge.username,
          })
        : undefined;
      const userSeed = badge.username ?? badge.userId;
      return (
        <ClaimParticipationCard
          name={badge.name}
          builderNumber={badge.builderNumber}
          userSeed={userSeed}
          projectTitle={badge.projectTitle}
          projectBlurb={badge.projectBlurb}
          profileUrl={profileUrl}
          claimed
          hideClaimedBadge
        />
      );
    }
    default:
      return null;
  }
}

// Shown when a user has no badges — same footprint as a badge thumbnail.
function BadgesEmptyCard({ readOnly = false }: { readOnly?: boolean }) {
  if (readOnly) {
    return (
      <p className="font-mono text-[12px] text-neutral-500 py-6 shrink-0">No badges yet.</p>
    );
  }

  return (
    <div
      className="flex shrink-0 flex-col items-center justify-center gap-3 rounded-[1rem] border border-dashed border-accent-events/40 bg-white p-5 text-center"
      style={{ width: BADGE_THUMB_WIDTH, minHeight: BADGE_THUMB_HEIGHT }}
    >
      <p className="font-mono text-[11px] leading-[1.6] uppercase tracking-[0.3px] text-accent-events/75">
        No badges yet.
        <br />
        Claim your Green
        <br />
        Hackathon badge.
      </p>
      <Link
        href="/claim/participation"
        className={`${robotoMono.className} inline-flex items-center rounded-full border border-white/35 bg-accent-events px-4 py-2 text-[10px] font-semibold uppercase tracking-wide text-white transition-colors hover:bg-white hover:text-accent-events`}
      >
        Claim badge
      </Link>
    </div>
  );
}

// ─── Right panel: projects + badges ────────────────────────────────────────────

const INITIAL_VISIBLE_PROJECTS = 2;

function SeeMoreProjectsButton({ count, onClick }: { count: number; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${robotoMono.className} ${dashboardProjectCardFootprintClassName} ${projectCardAddReferenceClassName} flex items-center justify-center gap-2 text-sm font-semibold uppercase tracking-wide text-accent-events`}
    >
      See {count} more
      <span aria-hidden>→</span>
    </button>
  );
}

function RightPanel({
  builderName,
  userId,
  readOnly = false,
}: {
  builderName: string;
  userId: Id<"users">;
  readOnly?: boolean;
}) {
  const router = useRouter();
  const myProjects = useQuery(api.projects.listMine, readOnly ? "skip" : {});
  const currentUser = useQuery(api.users.getCurrentUser, readOnly ? "skip" : {});
  const userProjects = useQuery(api.projects.listForUser, readOnly ? { userId } : "skip");
  const projects: ProfileProject[] | undefined = readOnly ? userProjects : myProjects;

  const myBadges = useQuery(api.badges.listMine, readOnly ? "skip" : {});
  const userBadges = useQuery(api.badges.listForUser, readOnly ? { userId } : "skip");
  const badges = readOnly ? userBadges : myBadges;
  const ensureMyBadges = useMutation(api.badges.ensureMine);
  const [siteOrigin, setSiteOrigin] = useState("");
  const [isJoiningProject, setIsJoiningProject] = useState(false);
  const [showAllProjects, setShowAllProjects] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<Id<"projects"> | null>(null);

  const editingProject =
    !readOnly && myProjects
      ? (myProjects.find((project) => project._id === editingProjectId) ?? null)
      : null;

  const displayProjects = useMemo(
    () =>
      buildDisplayProjects(
        projects,
        badges,
        builderName,
        currentUser?.hiddenClaimedHackathonProjectOnDashboard === true,
      ),
    [projects, badges, builderName, currentUser?.hiddenClaimedHackathonProjectOnDashboard],
  );
  const hiddenProjectCount = Math.max(0, displayProjects.length - INITIAL_VISIBLE_PROJECTS);
  const visibleProjects =
    !showAllProjects ? displayProjects.slice(0, INITIAL_VISIBLE_PROJECTS) : displayProjects;
  const canShowMore = hiddenProjectCount > 0 && !showAllProjects;
  const projectsLoading = projects === undefined || badges === undefined;

  useEffect(() => {
    setSiteOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    if (readOnly) return;
    void ensureMyBadges();
  }, [ensureMyBadges, readOnly]);

  return (
    <>
      <section className="flex min-w-0 flex-1 flex-col gap-8 overflow-y-auto rounded-[28px] bg-white px-0 py-7 shadow-[0_4px_20px_rgba(0,0,0,0.08)] lg:gap-10 lg:rounded-[40px] lg:py-9">
        {/* Projects */}
        <div className="min-w-0 py-1">
          <div className="flex flex-col gap-3 px-5 sm:flex-row sm:items-center sm:justify-between sm:gap-4 lg:px-10">
            <h2 className={`${robotoFlex.className} text-[28px] font-semibold leading-none tracking-[-0.02em] text-neutral-900 lg:text-[32px]`}>
              <FloatingHeader>Projects</FloatingHeader>
            </h2>
            {!readOnly ? (
              <ProjectSectionHeaderActions
                onAddProject={() => router.push("/onboard/project")}
                onJoinWithCode={() => setIsJoiningProject(true)}
              />
            ) : null}
          </div>
          <div className="min-w-0 px-5 pt-5 pb-4 lg:px-10 lg:pt-6">
            {projectsLoading ? (
              <p className="font-mono text-[12px] text-neutral-500 py-6">Loading projects…</p>
            ) : displayProjects.length === 0 ? (
              readOnly ? (
                <p className="font-mono text-[12px] text-neutral-500 py-6">No projects yet.</p>
              ) : (
              <div className={`${dashboardProjectCardFootprintClassName} flex shrink-0 flex-col`}>
                <AddProjectCard
                  variant="dashboard"
                  className="w-full"
                  onClick={() => router.push("/onboard/project")}
                />
              </div>
              )
            ) : (
              <div className="pb-1 lg:overflow-x-auto lg:overflow-y-hidden">
                <div className="flex flex-col gap-4 lg:w-max lg:max-w-none lg:flex-row lg:flex-nowrap lg:items-start">
                  {visibleProjects.map((item) => {
                    if (item.kind === "claimed") {
                      return (
                        <div
                          key={item.id}
                          className={`${dashboardProjectCardFootprintClassName} flex shrink-0 flex-col`}
                        >
                          <ProjectCard
                            fieldLabel={HACKATHON_FIELDS[item.field]}
                            title={item.title}
                            builder={item.builder}
                            blurb={item.blurb}
                            showHackathonBranding={false}
                            showLinkPills={false}
                            hoverEffect="none"
                            interactive={Boolean(item.externalHref)}
                            externalHref={item.externalHref}
                            onOpen={() => {}}
                          />
                          {!readOnly ? (
                            <div className="mt-2 flex justify-end">
                              <ClaimedHackathonProjectActions
                                trigger="minimal"
                                menuVariant="panel"
                                allowHideFromDashboard
                                onEdit={() => router.push("/claim/project")}
                              />
                            </div>
                          ) : null}
                        </div>
                      );
                    }

                    const project = item.project;
                    const projectHref = primaryProjectLink(project);

                    return (
                    <div
                      key={project._id}
                      className={`${dashboardProjectCardFootprintClassName} flex shrink-0 flex-col`}
                    >
                      <ProjectCard
                        fieldLabel={HACKATHON_FIELDS[project.field]}
                        title={project.title}
                        builder={formatMemberNames(project.members, builderName)}
                        blurb={project.blurb}
                        liveUrl={project.liveUrl}
                        seekingLabels={projectSeekingLabels(project)}
                        showHackathonBranding={false}
                        showLinkPills={false}
                        hoverEffect="none"
                        interactive={Boolean(projectHref)}
                        externalHref={projectHref}
                        onOpen={() => {}}
                      />
                      {!readOnly ? (
                        <div className="mt-2 flex justify-end">
                          <ProjectActions
                            projectId={project._id}
                            projectTitle={project.title}
                            viewerRole={project.viewerRole}
                            hasPendingJoinRequest={project.hasPendingJoinRequest}
                            variant="events"
                            trigger="minimal"
                            menuVariant="panel"
                            allowHideFromDashboard
                            onEdit={() => setEditingProjectId(project._id)}
                          />
                        </div>
                      ) : null}
                    </div>
                    );
                  })}
                  {canShowMore ? (
                    <SeeMoreProjectsButton
                      count={hiddenProjectCount}
                      onClick={() => setShowAllProjects(true)}
                    />
                  ) : null}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Badges */}
        <div className="py-1">
          <h2 className={`${robotoFlex.className} text-[28px] font-semibold leading-none tracking-[-0.02em] text-neutral-900 px-5 lg:px-10 lg:text-[32px]`}>
            <FloatingHeader>Badges</FloatingHeader>
          </h2>
          <div className="flex flex-wrap items-stretch gap-4 px-5 pt-5 pb-4 sm:gap-5 lg:flex-nowrap lg:overflow-x-auto lg:px-10 lg:pt-6">
            {badges === undefined ? (
              <p className="font-mono text-[12px] text-neutral-500 py-6">Loading badges…</p>
            ) : badges.length === 0 ? (
              <BadgesEmptyCard readOnly={readOnly} />
            ) : (
              badges.map((badge) => (
                <ScaledBadgeThumb key={badge.id}>
                  <BadgeCard badge={badge} siteOrigin={siteOrigin} />
                </ScaledBadgeThumb>
              ))
            )}
          </div>
        </div>
      </section>

      {!readOnly && isJoiningProject ? (
        <JoinProjectModal
          onClose={() => setIsJoiningProject(false)}
          onJoined={() => setIsJoiningProject(false)}
        />
      ) : null}

      {!readOnly && editingProject ? (
        <EditProjectModal
          project={editingProject}
          onClose={() => setEditingProjectId(null)}
          onSaved={() => setEditingProjectId(null)}
        />
      ) : null}
    </>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────

/**
 * The two-panel profile layout, without any page-level gradient/sizing chrome.
 * Embed this where a host already provides the blue background (e.g. /dashboard);
 * use {@link ProfileTab} when you need the standalone full-page version.
 */
export function ProfileTabContent({
  user,
  readOnly = false,
  showFirstNameOnCard = false,
}: {
  user: ProfileUser;
  readOnly?: boolean;
  showFirstNameOnCard?: boolean;
}) {
  return (
    <div className="flex w-full flex-col items-stretch gap-4 lg:flex-row lg:gap-2.5">
      <LeftProfilePanel user={user} readOnly={readOnly} showFirstNameOnCard={showFirstNameOnCard} />
      <RightPanel builderName={user.name} userId={user._id} readOnly={readOnly} />
    </div>
  );
}

/** Standalone full-page profile (its own blue gradient). Used by /dashboard/original. */
export function ProfileTab() {
  const user = useQuery(api.users.getCurrentUser, {});

  return (
    <div className="min-h-dvh w-full p-4 md:p-6" style={{ background: PAGE_GRADIENT }}>
      {user === undefined ? (
        <p className="font-mono text-sm text-white/80">Loading…</p>
      ) : user === null ? (
        <p className="font-mono text-sm text-white/80">Profile not found.</p>
      ) : (
        <div className="mx-auto w-full max-w-[1600px]">
          <ProfileTabContent user={user} showFirstNameOnCard />
        </div>
      )}
    </div>
  );
}
