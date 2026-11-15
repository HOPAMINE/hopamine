/**
 * Prefix search over the hackathon directory, sorted by accent-folded title
 * (and a second index by builder). Binary search finds the first match
 * (O(log n)); then a short linear scan collects contiguous prefix hits.
 */

import {
  HACKATHON_PROJECTS,
  type HackathonField,
  type HackathonProject,
} from "./hackathonProjects";

export type IndexedHackathonProject = {
  hackathonIndex: number;
  field: HackathonField;
  title: string;
  builder: string;
  discord?: string;
  blurb: string;
  liveUrl?: string;
  demoUrl?: string;
  repoUrl?: string;
  foldedTitle: string;
  foldedBuilder: string;
};

/** Accent-folded lowercase key for binary search (same rules as city typeahead). */
export function foldProjectName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function toIndexed(
  project: HackathonProject,
  hackathonIndex: number,
): IndexedHackathonProject {
  return {
    hackathonIndex,
    field: project.field,
    title: project.title,
    builder: project.builder,
    discord: project.discord,
    blurb: project.blurb,
    liveUrl: project.liveUrl,
    demoUrl: project.demoUrl,
    repoUrl: project.repoUrl,
    foldedTitle: foldProjectName(project.title),
    foldedBuilder: foldProjectName(project.builder),
  };
}

const INDEXED: IndexedHackathonProject[] = HACKATHON_PROJECTS.map(toIndexed);

/** Sorted by folded title for binary prefix search. */
export const HACKATHON_PROJECTS_BY_TITLE: readonly IndexedHackathonProject[] = [
  ...INDEXED,
].sort(
  (a, b) =>
    a.foldedTitle.localeCompare(b.foldedTitle) ||
    a.hackathonIndex - b.hackathonIndex,
);

/** Sorted by folded builder for binary prefix search. */
export const HACKATHON_PROJECTS_BY_BUILDER: readonly IndexedHackathonProject[] = [
  ...INDEXED,
].sort(
  (a, b) =>
    a.foldedBuilder.localeCompare(b.foldedBuilder) ||
    a.hackathonIndex - b.hackathonIndex,
);

function lowerBoundByKey(
  rows: readonly IndexedHackathonProject[],
  key: "foldedTitle" | "foldedBuilder",
  needle: string,
): number {
  let lo = 0;
  let hi = rows.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (rows[mid]![key] < needle) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

function collectPrefixHits(
  rows: readonly IndexedHackathonProject[],
  key: "foldedTitle" | "foldedBuilder",
  prefix: string,
): IndexedHackathonProject[] {
  const start = lowerBoundByKey(rows, key, prefix);
  const hits: IndexedHackathonProject[] = [];
  for (let i = start; i < rows.length; i += 1) {
    const row = rows[i]!;
    if (!row[key].startsWith(prefix)) break;
    hits.push(row);
  }
  return hits;
}

/**
 * Hackathon directory rows whose title or builder folded name starts with
 * the typed prefix. Deduped by hackathonIndex, sorted by title.
 */
export function hackathonProjectsMatchingPrefix(
  rawPrefix: string,
): IndexedHackathonProject[] {
  const prefix = foldProjectName(rawPrefix);
  if (!prefix) return [];

  const byIndex = new Map<number, IndexedHackathonProject>();

  for (const hit of collectPrefixHits(
    HACKATHON_PROJECTS_BY_TITLE,
    "foldedTitle",
    prefix,
  )) {
    byIndex.set(hit.hackathonIndex, hit);
  }

  for (const hit of collectPrefixHits(
    HACKATHON_PROJECTS_BY_BUILDER,
    "foldedBuilder",
    prefix,
  )) {
    byIndex.set(hit.hackathonIndex, hit);
  }

  return Array.from(byIndex.values()).sort(
    (a, b) =>
      a.foldedTitle.localeCompare(b.foldedTitle) ||
      a.hackathonIndex - b.hackathonIndex,
  );
}

/** Sorted hackathon indexes only — for Convex to fetch DB rows. */
export function hackathonIndicesMatchingPrefix(rawPrefix: string): number[] {
  return hackathonProjectsMatchingPrefix(rawPrefix).map((row) => row.hackathonIndex);
}
