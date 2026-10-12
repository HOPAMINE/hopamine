"use client";

import { SocialCard } from "@/app/social/SocialCard";
import { toSocialProfile, type ZimaSearchResult } from "@/lib/zima/searchResults";
import { jetbrainsMono } from "../../../fonts";
import { ZimaSearchMessageButton } from "./ZimaSearchMessageButton";

type Props = {
  results: ZimaSearchResult[];
  loadingResults?: boolean;
  errorMessage?: string | null;
  cityLabel?: string;
  selectedResultId?: string | null;
  onSelectResult?: (id: string) => void;
  /** Desktop left bar: two builders per row. */
  columns?: 1 | 2;
};

export function ZimaSearchResultCards({
  results,
  loadingResults = false,
  errorMessage = null,
  cityLabel = "New York City",
  selectedResultId,
  onSelectResult,
  columns = 1,
}: Props) {
  const twoColumn = columns === 2;
  const statusClass = `${jetbrainsMono.className} py-6 text-center text-[13px] text-neutral-500`;

  if (errorMessage) {
    return <p className={`${statusClass} text-red-600`}>{errorMessage}</p>;
  }
  if (loadingResults && results.length === 0) {
    return <p className={statusClass}>Searching {cityLabel}…</p>;
  }
  if (results.length === 0) {
    return (
      <p className={statusClass}>
        No builders match yet. Try fewer filters or different words.
      </p>
    );
  }

  return (
    <ul className={twoColumn ? "grid grid-cols-2 gap-3" : "flex flex-col gap-4"}>
      {results.map((result) => {
        const profile = toSocialProfile(result);
        const isSelected = selectedResultId === result._id;

        return (
          <li key={result._id} className="min-w-0">
            <div
              className={
                isSelected
                  ? twoColumn
                    ? "overflow-hidden rounded-2xl ring-2 ring-[#00a6f3] ring-offset-2"
                    : "overflow-hidden rounded-2xl ring-2 ring-[#00a6f3] ring-inset"
                  : undefined
              }
            >
              <SocialCard
                profile={profile}
                theme="zima"
                compact
                compactGrid={twoColumn}
                onPress={onSelectResult ? () => onSelectResult(result._id) : undefined}
                cornerAction={
                  <ZimaSearchMessageButton
                    profileId={result._id}
                    convexUserId={result._id}
                    displayName={result.name}
                  />
                }
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
