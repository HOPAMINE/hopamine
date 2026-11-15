"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { api } from "../../convex/_generated/api";
import { getPublicProfileUrlForUser } from "@/lib/profileUrls";
import { roboto, robotoMono } from "../../fonts";
import { ClaimNavbar } from "./ClaimNavbar";
import { ClaimParticipationCard } from "./ClaimParticipationCard";
import { downloadParticipationCard } from "./downloadParticipationCard";
import { toHackathonProject } from "./directoryProject";
import { PARTICIPATION_CARD_WIDTH } from "./participationCardStyles";

const inputClassName = `${robotoMono.className} w-full rounded-lg border border-white/25 bg-[#126609] px-4 py-3 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/50`;

const claimBadgeButtonClass = `${robotoMono.className} inline-flex w-full max-w-md items-center justify-center rounded-full bg-white px-10 py-4 text-sm font-semibold uppercase tracking-wide text-[#13450E] shadow-lg transition-opacity hover:opacity-90 disabled:opacity-40`;

const downloadButtonClass = `${robotoMono.className} inline-flex items-center rounded-full bg-white px-6 py-3 text-[11px] font-semibold uppercase tracking-wide text-[#13450E] transition-opacity hover:opacity-90 disabled:opacity-40`;

const secondaryLinkClass = `${robotoMono.className} inline-flex items-center text-xs font-semibold uppercase tracking-wide text-white/75 underline underline-offset-4 transition-colors hover:text-white`;

export function ClaimParticipationContent() {
  const { user } = useUser();
  const participation = useQuery(api.hackathonParticipations.getMine);
  const projectClaim = useQuery(api.hackathonClaims.getMyProject);
  const convexUser = useQuery(api.users.getCurrentUser, user ? {} : "skip");
  const claimParticipation = useMutation(api.hackathonParticipations.claim);
  const claimProject = useMutation(api.hackathonClaims.claimProject);
  const ensureMyBadges = useMutation(api.badges.ensureMine);
  const cardRef = useRef<HTMLElement>(null);

  const [search, setSearch] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");
  const [downloadError, setDownloadError] = useState("");
  const [siteOrigin, setSiteOrigin] = useState("");

  useEffect(() => {
    setSiteOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    if (projectClaim?.projectIndex !== undefined) {
      setSelectedIndex(projectClaim.projectIndex);
    }
  }, [projectClaim?.projectIndex]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(search), 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  const directoryProjects = useQuery(api.projects.searchHackathonDirectory, {
    query: debouncedQuery,
  });
  const filteredProjects = directoryProjects ?? [];

  const displayName =
    convexUser?.name?.trim() || user?.fullName || user?.firstName || "Builder";
  const claimed = participation !== null && participation !== undefined;
  const projectClaimed = projectClaim !== null && projectClaim !== undefined;

  const selectedDirectoryProject =
    selectedIndex === null
      ? null
      : (directoryProjects?.find((project) => project.hackathonIndex === selectedIndex) ?? null);

  const selectedProject = selectedDirectoryProject
    ? toHackathonProject(selectedDirectoryProject)
    : null;

  const claimedProject = useMemo(() => {
    if (projectClaim === undefined || projectClaim === null) {
      return null;
    }

    const directoryProject = directoryProjects?.find(
      (project) => project.hackathonIndex === projectClaim.projectIndex,
    );
    return {
      title: directoryProject?.title ?? projectClaim.projectTitle,
      blurb: directoryProject?.blurb ?? projectClaim.blurb,
      projectIndex: projectClaim.projectIndex,
    };
  }, [directoryProjects, projectClaim]);

  const defaultProfileUrl = useMemo(() => {
    if (!siteOrigin || !convexUser) return "";
    return getPublicProfileUrlForUser(siteOrigin, convexUser);
  }, [convexUser, siteOrigin]);

  const cardUserSeed = convexUser?.username ?? convexUser?._id ?? user?.id ?? "";
  const cardProjectTitle = projectClaimed ? claimedProject?.title : selectedProject?.title;
  const cardProjectBlurb = projectClaimed ? claimedProject?.blurb : selectedProject?.blurb;

  async function handleClaimParticipation() {
    if (saving) return;

    if (selectedIndex === null || !selectedProject) {
      setError("Select the project you worked on before claiming.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      if (!claimed) {
        await claimParticipation({});
      }

      if (!projectClaimed) {
        await claimProject({
          projectIndex: selectedIndex,
          projectTitle: selectedProject.title,
          builderName: selectedProject.builder,
          field: selectedProject.field,
          blurb: selectedProject.blurb,
        });
      }

      await ensureMyBadges();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to claim participation.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDownload() {
    if (!cardRef.current || downloading) return;

    setDownloading(true);
    setDownloadError("");

    try {
      const slug = displayName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      await downloadParticipationCard(
        cardRef.current,
        `green-hackathon-builder-card${slug ? `-${slug}` : ""}.png`,
      );
    } catch (err: unknown) {
      setDownloadError(err instanceof Error ? err.message : "Failed to download card.");
    } finally {
      setDownloading(false);
    }
  }

  if (participation === undefined || projectClaim === undefined || directoryProjects === undefined) {
    return (
      <div className="flex min-h-dvh flex-col bg-[#13450E] text-white">
        <ClaimNavbar />
        <p className={`${robotoMono.className} px-5 text-sm text-white/75`}>Loading…</p>
      </div>
    );
  }

  const showProjectPicker = !projectClaimed && selectedIndex === null;
  const showSelectedProject = !projectClaimed && selectedIndex !== null && selectedProject;
  const showClaimButton = !claimed || !projectClaimed;
  const fullyClaimed = claimed && projectClaimed;

  return (
    <div className="flex min-h-dvh flex-col bg-[#13450E] text-white lg:h-dvh lg:overflow-hidden">
      <div className="shrink-0">
        <ClaimNavbar />
      </div>

      <div className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col lg:flex-row lg:gap-10 lg:px-8">
        {/* Left — project selection */}
        <div
          className={`flex min-h-0 flex-1 flex-col px-5 pt-4 lg:max-w-md lg:py-6 xl:max-w-lg ${showClaimButton ? "pb-28 lg:pb-6" : "pb-6"}`}
        >
          <Link href="/claim" className={secondaryLinkClass}>
            ← All claims
          </Link>
          <h1
            className={`${roboto.className} mt-4 text-center text-3xl font-bold tracking-[-0.03em] sm:text-4xl lg:text-left`}
          >
            {fullyClaimed ? "Participation claimed" : "Claim your participation"}
          </h1>
          <p
            className={`${roboto.className} mt-3 text-center text-base text-white/80 lg:text-left`}
          >
            {fullyClaimed
              ? "You’re verified as a Green Hackathon builder on Hopamine."
              : claimed
                ? "Select your project to finish your card."
                : "Select the project you worked on, then claim your builder badge."}
          </p>

          <div className="mt-6 flex min-h-0 flex-1 flex-col">
            {showProjectPicker ? (
              <div className="flex min-h-0 flex-1 flex-col gap-4">
                <label className="block shrink-0">
                  <span
                    className={`${robotoMono.className} mb-2 block text-xs font-semibold uppercase tracking-wide text-white/70`}
                  >
                    Your project
                  </span>
                  <input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className={inputClassName}
                    placeholder="Search by project name or builder"
                  />
                </label>

                <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1 max-h-[20rem] sm:max-h-[24rem] lg:max-h-none">
                  {filteredProjects.length > 0 ? (
                    filteredProjects.map((project) => (
                      <li key={`${project.hackathonIndex}-${project.title}`}>
                        <button
                          type="button"
                          onClick={() => setSelectedIndex(project.hackathonIndex)}
                          className={`${robotoMono.className} w-full rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-left text-sm text-white transition-colors hover:border-white/40`}
                        >
                          <span className="block font-semibold uppercase tracking-wide">
                            {project.title}
                          </span>
                          <span className="mt-1 block text-xs text-white/65">{project.builder}</span>
                        </button>
                      </li>
                    ))
                  ) : (
                    <li
                      className={`${robotoMono.className} rounded-lg border border-white/15 px-4 py-6 text-center text-sm text-white/60`}
                    >
                      {directoryProjects.length === 0
                        ? "Hackathon projects are still loading. Check back shortly."
                        : "No projects match your search."}
                    </li>
                  )}
                </ul>
              </div>
            ) : null}

            {showSelectedProject ? (
              <div
                className={`${robotoMono.className} flex shrink-0 items-center gap-3 rounded-lg border border-white bg-white px-4 py-3 text-sm text-[#13450E]`}
              >
                <div className="min-w-0 flex-1">
                  <span className="block truncate font-semibold uppercase tracking-wide">
                    {selectedProject.title}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-[#13450E]/75">
                    {selectedProject.builder}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedIndex(null)}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#13450E]/25 text-[#13450E] transition-colors hover:bg-[#13450E]/10"
                  aria-label="Clear project selection"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="h-4 w-4"
                    aria-hidden
                  >
                    <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                  </svg>
                </button>
              </div>
            ) : null}

            {fullyClaimed ? (
              <ul
                className={`${robotoMono.className} mt-6 space-y-2 text-center text-xs font-semibold uppercase tracking-wide text-white/70 lg:text-left`}
              >
                <li>Builder ID: {participation.builderNumber.toString().padStart(3, "0")}</li>
                <li>Project: {claimedProject?.title}</li>
              </ul>
            ) : null}
          </div>

          {error ? (
            <p
              className={`${robotoMono.className} mt-4 shrink-0 text-center text-sm text-red-200 lg:text-left`}
              role="alert"
            >
              {error}
            </p>
          ) : null}

          {showClaimButton ? (
            <div className="mt-6 hidden shrink-0 lg:block">
              <button
                type="button"
                disabled={saving || selectedIndex === null}
                onClick={handleClaimParticipation}
                className={`${claimBadgeButtonClass} w-full`}
              >
                {saving ? "Claiming…" : "Claim badge"}
              </button>
            </div>
          ) : null}
        </div>

        {/* Right — badge preview */}
        <div className="flex shrink-0 flex-col items-center px-5 pb-6 lg:min-h-0 lg:flex-1 lg:justify-center lg:overflow-hidden lg:px-0 lg:py-6">
          <div className="flex w-full items-center justify-center overflow-hidden lg:max-h-[calc(100dvh-7rem)]">
            <section
              className="w-full origin-center lg:scale-[0.78] xl:scale-90 2xl:scale-100"
              style={{ maxWidth: PARTICIPATION_CARD_WIDTH }}
            >
              <ClaimParticipationCard
                ref={cardRef}
                name={displayName}
                builderNumber={claimed ? participation?.builderNumber : undefined}
                userSeed={cardUserSeed || undefined}
                projectTitle={cardProjectTitle}
                projectBlurb={cardProjectBlurb}
                profileUrl={defaultProfileUrl || undefined}
                claimed={claimed}
              />

              {fullyClaimed ? (
                <>
                  <button
                    type="button"
                    disabled={downloading}
                    onClick={handleDownload}
                    className={`${downloadButtonClass} mt-4 w-full justify-center`}
                  >
                    {downloading ? "Preparing…" : "Download"}
                  </button>

                  {downloadError ? (
                    <p
                      className={`${robotoMono.className} mt-3 text-center text-sm text-red-200`}
                      role="alert"
                    >
                      {downloadError}
                    </p>
                  ) : null}

                  <Link
                    href="/dashboard"
                    className={`${secondaryLinkClass} mt-4 flex w-full justify-center`}
                  >
                    View dashboard
                  </Link>
                </>
              ) : null}
            </section>
          </div>
        </div>
      </div>

      {showClaimButton ? (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-[#13450E]/95 px-5 py-4 backdrop-blur-sm lg:hidden">
          <div className="mx-auto flex max-w-md justify-center">
            <button
              type="button"
              disabled={saving || selectedIndex === null}
              onClick={handleClaimParticipation}
              className={claimBadgeButtonClass}
            >
              {saving ? "Claiming…" : "Claim badge"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
