"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { api } from "../../convex/_generated/api";
import type { HackathonProject } from "@/lib/hackathonDirectory";
import { roboto, robotoMono } from "../../fonts";
import { ClaimNavbar } from "./ClaimNavbar";
import { ClaimProjectCard } from "./ClaimProjectCard";
import { toHackathonProject } from "./directoryProject";

const inputClassName = `${robotoMono.className} w-full rounded-lg border border-white/25 bg-[#13450E] px-4 py-3 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/50`;

const primaryButtonClass = `${robotoMono.className} inline-flex items-center rounded-full bg-white px-6 py-3 text-[11px] font-semibold uppercase tracking-wide text-[#13450E] transition-opacity hover:opacity-90 disabled:opacity-40`;

const secondaryLinkClass = `${robotoMono.className} inline-flex items-center text-xs font-semibold uppercase tracking-wide text-white/75 underline underline-offset-4 transition-colors hover:text-white`;

export function ClaimProjectContent() {
  const { user, isLoaded: clerkLoaded } = useUser();
  const convexUser = useQuery(api.users.getCurrentUser, clerkLoaded && user ? {} : "skip");
  const myClaim = useQuery(api.hackathonClaims.getMyProject);
  const claimProject = useMutation(api.hackathonClaims.claimProject);
  const showClaimedProjectOnDashboard = useMutation(
    api.users.showClaimedHackathonProjectOnDashboard,
  );

  useEffect(() => {
    if (myClaim) {
      void showClaimedProjectOnDashboard({});
    }
  }, [myClaim, showClaimedProjectOnDashboard]);

  const [search, setSearch] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(search), 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  const directoryProjects = useQuery(api.projects.searchHackathonDirectory, {
    query: debouncedQuery,
  });
  const filteredProjects = directoryProjects ?? [];

  const selectedDirectoryProject =
    selectedIndex === null
      ? null
      : (directoryProjects?.find((project) => project.hackathonIndex === selectedIndex) ?? null);

  const selectedProject: HackathonProject | null = selectedDirectoryProject
    ? toHackathonProject(selectedDirectoryProject)
    : null;

  const claimedProject: HackathonProject | null = useMemo(() => {
    if (!myClaim) return null;
    const fromDb = directoryProjects?.find(
      (project) => project.hackathonIndex === myClaim.projectIndex,
    );
    if (fromDb) return toHackathonProject(fromDb);
    return {
      field: myClaim.field,
      title: myClaim.projectTitle,
      builder: myClaim.builderName,
      blurb: myClaim.blurb,
    };
  }, [directoryProjects, myClaim]);

  async function handleClaim() {
    if (selectedIndex === null || !selectedProject || saving) return;

    setSaving(true);
    setError("");

    try {
      await claimProject({
        projectIndex: selectedIndex,
        projectTitle: selectedProject.title,
        builderName: selectedProject.builder,
        field: selectedProject.field,
        blurb: selectedProject.blurb,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to claim project.");
    } finally {
      setSaving(false);
    }
  }

  if (!clerkLoaded || myClaim === undefined || directoryProjects === undefined) {
    return (
      <div className="flex min-h-dvh flex-col bg-[#13450E] text-white">
        <ClaimNavbar />
        <p className={`${robotoMono.className} px-5 text-sm text-white/75`}>Loading…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-dvh flex-col bg-[#13450E] text-white">
        <ClaimNavbar />
        <div className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center px-5 pb-16 text-center">
          <h1 className={`${roboto.className} text-3xl font-bold tracking-[-0.03em] sm:text-4xl`}>
            Claim your project
          </h1>
          <p className={`${roboto.className} mt-4 text-base text-white/80`}>
            Sign in to link your Green Hackathon project on Hopamine.
          </p>
          <Link href="/sign-in?redirect_url=/claim/project" className={`${primaryButtonClass} mt-8`}>
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  if (myClaim && claimedProject) {
    return (
      <div className="flex min-h-dvh flex-col bg-[#13450E] text-white">
        <ClaimNavbar />
        <div className="mx-auto w-full max-w-3xl flex-1 px-5 pb-16 pt-4">
          <Link href="/claim" className={secondaryLinkClass}>
            ← All claims
          </Link>
          <h1 className={`${roboto.className} mt-4 text-center text-3xl font-bold tracking-[-0.03em] sm:text-4xl`}>
            Project claimed
          </h1>
          <p className={`${roboto.className} mt-3 text-center text-base text-white/80`}>
            This is your hackathon project card on Hopamine.
          </p>
          <div className="mt-8">
            <ClaimProjectCard
              project={claimedProject}
              claimed
              claimantName={
                convexUser?.name?.trim() ||
                user.fullName ||
                user.firstName ||
                myClaim.builderName
              }
            />
          </div>
        </div>
      </div>
    );
  }

  const showProjectPicker = selectedIndex === null;
  const showSelectedProject = selectedIndex !== null && selectedProject;

  return (
    <div className="flex min-h-dvh flex-col bg-[#13450E] text-white">
      <ClaimNavbar />

      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-5 pb-28 pt-4">
        <Link href="/claim" className={secondaryLinkClass}>
          ← All claims
        </Link>
        <h1
          className={`${roboto.className} mt-4 text-center text-3xl font-bold tracking-[-0.03em] sm:text-4xl`}
        >
          Claim your project
        </h1>
        <p className={`${roboto.className} mt-3 text-center text-base text-white/80`}>
          Find your hackathon project in the directory and claim your spot on the team.
        </p>

        {showProjectPicker ? (
          <>
            <label className="mt-6 block">
              <span
                className={`${robotoMono.className} mb-2 block text-xs font-semibold uppercase tracking-wide text-white/70`}
              >
                Search projects
              </span>
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={inputClassName}
                placeholder="Project name or builder"
              />
            </label>

            <ul className="mt-4 max-h-[20rem] space-y-2 overflow-y-auto pr-1 sm:max-h-[24rem]">
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
                  No projects match your search.
                </li>
              )}
            </ul>
          </>
        ) : null}

        {showSelectedProject ? (
          <div
            className={`${robotoMono.className} mt-6 flex items-center gap-3 rounded-lg border border-white bg-white px-4 py-3 text-sm text-[#13450E]`}
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

        {error ? (
          <p className={`${robotoMono.className} mt-4 text-center text-sm text-red-200`} role="alert">
            {error}
          </p>
        ) : null}

        <section className="mt-8">
          <ClaimProjectCard project={selectedProject} />
        </section>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-[#13450E]/95 px-5 py-4 backdrop-blur-sm">
        <div className="mx-auto flex max-w-md justify-center">
          <button
            type="button"
            disabled={selectedIndex === null || saving}
            onClick={handleClaim}
            className={`${robotoMono.className} inline-flex w-full max-w-md items-center justify-center rounded-full bg-white px-10 py-4 text-sm font-semibold uppercase tracking-wide text-[#13450E] shadow-lg transition-opacity hover:opacity-90 disabled:opacity-40`}
          >
            {saving ? "Claiming…" : "Claim this project"}
          </button>
        </div>
      </div>
    </div>
  );
}
