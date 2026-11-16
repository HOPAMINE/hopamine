"use client";

import Image from "next/image";
import { robotoMono, sortsMillGoudy } from "../../fonts";
import { GREEN_HACKATHON_TAG, type HackathonProject } from "@/lib/hackathonDirectory";
import { formatProjectTitle } from "@/lib/formatProjectTitle";
import { ProjectLinkPills } from "./ProjectLinkPills";
import {
  projectCardCompactDashboardShellClassName,
  projectCardCompactPortalShellClassName,
  projectCardCompactShellClassName,
  projectCardDashboardShellClassName,
  projectCardPortalShellClassName,
  projectCardShellClassName,
  projectCardStaticShellClassName,
} from "./projectCardStyles";

type ProjectCardProps = Pick<
  HackathonProject,
  "title" | "builder" | "blurb" | "liveUrl" | "demoUrl" | "repoUrl"
> & {
  fieldLabel: string;
  onOpen: () => void;
  showLinkPills?: boolean;
  showHackathonBranding?: boolean;
  variant?: "events" | "dashboard" | "portal";
  size?: "default" | "compact";
  interactive?: boolean;
  /** Keep the green card on hover (dashboard profile projects). */
  hoverEffect?: "invert" | "none";
  externalHref?: string;
  seekingLabels?: string[];
};

export function ProjectCard({
  fieldLabel,
  title,
  builder,
  blurb,
  liveUrl,
  demoUrl,
  repoUrl,
  onOpen,
  showLinkPills = true,
  showHackathonBranding = true,
  variant = "events",
  size = "default",
  interactive = true,
  hoverEffect = "invert",
  externalHref,
  seekingLabels = [],
}: ProjectCardProps) {
  const isCompact = size === "compact";
  const isStaticHover = hoverEffect === "none";
  const isPortal = variant === "portal";
  const shellClassName =
    variant === "dashboard"
      ? isCompact
        ? projectCardCompactDashboardShellClassName
        : projectCardDashboardShellClassName
      : isPortal
        ? isCompact
          ? projectCardCompactPortalShellClassName
          : projectCardPortalShellClassName
        : isCompact
          ? projectCardCompactShellClassName
          : isStaticHover
            ? projectCardStaticShellClassName
            : projectCardShellClassName;
  const textColor = variant === "dashboard" ? "text-accent-navbar" : "text-white";
  const textMuted = variant === "dashboard" ? "text-accent-navbar/80" : "text-white/80";
  const hoverText = isStaticHover
    ? ""
    : variant === "dashboard"
      ? "group-hover/card:text-white"
      : isPortal
        ? "group-hover/card:text-accent-navbar"
        : "group-hover/card:text-accent-events";
  const hoverTextMuted = isStaticHover
    ? ""
    : variant === "dashboard"
      ? "group-hover/card:text-white/80"
      : isPortal
        ? "group-hover/card:text-accent-navbar/80"
        : "group-hover/card:text-accent-events/80";
  const logoClass = isCompact
    ? "h-[1.25rem] w-auto shrink-0 transition-opacity duration-200 group-hover/card:opacity-0"
    : "h-[1.8rem] w-auto shrink-0 transition-opacity duration-200 group-hover/card:opacity-0 sm:h-[2.1rem]";
  const logoHoverClass = isCompact
    ? "absolute left-0 top-0 h-[1.25rem] w-auto shrink-0 opacity-0 transition-opacity duration-200 group-hover/card:opacity-100"
    : "absolute left-0 top-0 h-[1.8rem] w-auto shrink-0 opacity-0 transition-opacity duration-200 group-hover/card:opacity-100 sm:h-[2.1rem]";
  const fieldClass = isCompact
    ? `text-[10px] sm:text-[10px]`
    : `text-[10px] sm:text-[11px]`;
  const labelClass = isCompact ? `text-[10px] sm:text-[10px]` : `text-xs sm:text-sm`;
  const titleClass = isCompact
    ? `mt-1.5 text-[1.375rem] sm:text-[1.375rem] sm:tracking-[-0.06em]`
    : `mt-2 text-3xl sm:text-4xl sm:tracking-[-0.06em]`;
  const blurbClass = isCompact ? `text-[10px] sm:text-[10px]` : `text-xs sm:text-sm`;
  const bodyTopClass = isCompact ? "mt-auto pt-3" : "mt-auto pt-6";

  const cardBody = (
    <>
      <div
        className={`flex flex-wrap items-start gap-3 ${showHackathonBranding ? "justify-between" : "justify-start"}`}
      >
          {showHackathonBranding ? (
            <div className="flex min-w-0 flex-col gap-2">
              <div className="relative flex min-w-0 items-center">
                <Image
                  src="/greenhack_tl.svg"
                  alt=""
                  width={340}
                  height={138}
                  unoptimized
                  aria-hidden
                  className={logoClass}
                />
                <Image
                  src="/greenhack_white.svg"
                  alt="The Green Hackathon"
                  width={340}
                  height={138}
                  unoptimized
                  className={logoHoverClass}
                />
              </div>
              {variant === "events" ? (
                <span
                  className={`${robotoMono.className} font-semibold uppercase tracking-wide ${fieldClass} ${textColor} transition-colors duration-200 ${hoverText}`}
                >
                  {GREEN_HACKATHON_TAG}
                </span>
              ) : null}
            </div>
          ) : null}
          <p
            className={`${robotoMono.className} font-semibold uppercase tracking-wide ${labelClass} ${textColor} transition-colors duration-200 ${hoverText} ${showHackathonBranding ? "text-right" : ""}`}
          >
            {fieldLabel}
          </p>
        </div>

        <div className={bodyTopClass}>
          <p
            className={`${robotoMono.className} font-semibold uppercase tracking-wide ${labelClass} ${textMuted} transition-colors duration-200 ${hoverTextMuted}`}
          >
            {builder}
          </p>
          <h3
            className={`${sortsMillGoudy.className} normal-case leading-[1.02] tracking-[-0.05em] ${titleClass} ${textColor} transition-colors duration-200 ${hoverText}`}
          >
            {formatProjectTitle(title)}
          </h3>
          <p
            className={`${robotoMono.className} mt-2 line-clamp-2 font-semibold uppercase leading-relaxed tracking-wide ${blurbClass} ${textColor} transition-colors duration-200 ${hoverText}`}
          >
            {blurb}
          </p>
          {seekingLabels.length > 0 ? (
            <div className={`mt-2 flex flex-wrap gap-1.5 ${isCompact ? "gap-1" : ""}`}>
              {seekingLabels.map((label) => (
                <span
                  key={label}
                  className={`${robotoMono.className} rounded-full border px-2 py-0.5 font-semibold uppercase tracking-wide ${
                    isCompact ? "text-[9px]" : "text-[10px]"
                  } ${
                    variant === "dashboard"
                      ? "border-accent-navbar/40 text-accent-navbar"
                      : "border-white/45 text-white"
                  } transition-colors duration-200 ${hoverText}`}
                >
                  {label}
                </span>
              ))}
            </div>
          ) : null}
        </div>
    </>
  );

  return (
    <div className={isCompact ? "flex shrink-0 flex-col gap-3" : "flex h-full flex-col gap-3"}>
      {interactive ? (
        externalHref ? (
          <a
            href={externalHref}
            target="_blank"
            rel="noopener noreferrer"
            className={shellClassName}
          >
            {cardBody}
          </a>
        ) : (
          <button type="button" onClick={onOpen} className={shellClassName}>
            {cardBody}
          </button>
        )
      ) : (
        <div className={`${shellClassName} cursor-default`}>{cardBody}</div>
      )}
      {showLinkPills ? (
        <ProjectLinkPills
          demoUrl={demoUrl}
          liveUrl={liveUrl}
          repoUrl={repoUrl}
          variant={isPortal ? "portal" : "events"}
        />
      ) : null}
    </div>
  );
}
