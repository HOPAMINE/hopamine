"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import {
  ZIMA_SEARCH_CITIES,
  zimaSearchCityById,
} from "../../../shared/zimaSearchCities";
import { ZIMA_ARCHETYPES, ZIMA_INTERESTS } from "../../../shared/zimaVocabulary";
import { jetbrainsMono } from "../../../fonts";
import type { ZimaSearchFilterState } from "./useZimaSearch";

const HOPAMINE_BLUE = "#00a6f3";

const FILTER_CHECKBOX_PX = 20;
const FILTER_CHECKMARK_PX = 14;
const FILTER_CHECKBOX_OFF = "#D9D9D9";

function FilterCheckboxBox({ isOn }: { isOn: boolean }) {
  return (
    <span
      aria-hidden
      className="inline-flex flex-none items-center justify-center rounded-none"
      style={{
        width: FILTER_CHECKBOX_PX,
        height: FILTER_CHECKBOX_PX,
        minWidth: FILTER_CHECKBOX_PX,
        minHeight: FILTER_CHECKBOX_PX,
        backgroundColor: isOn ? HOPAMINE_BLUE : FILTER_CHECKBOX_OFF,
        boxShadow: isOn ? undefined : "inset 0 0 0 1px rgba(0, 0, 0, 0.18)",
      }}
    >
      {isOn ? (
        <svg
          viewBox="0 0 12 12"
          width={FILTER_CHECKMARK_PX}
          height={FILTER_CHECKMARK_PX}
          className="block shrink-0"
          fill="none"
          stroke="white"
          strokeWidth="1.75"
          strokeLinecap="square"
        >
          <path d="M2.5 6l2.5 2.5L9.5 4" />
        </svg>
      ) : null}
    </span>
  );
}

function FilterCheckbox({
  label,
  isOn,
  onClick,
  children,
  ariaExpanded,
  ariaControls,
  opensPopover = false,
  className = "",
}: {
  label: string;
  isOn: boolean;
  onClick: () => void;
  children?: ReactNode;
  ariaExpanded?: boolean;
  ariaControls?: string;
  opensPopover?: boolean;
  className?: string;
}) {
  const inputId = useId();
  const rowClass = `${jetbrainsMono.className} inline-flex h-8 shrink-0 cursor-pointer items-center gap-2.5 bg-transparent px-1 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-800 sm:text-[12px] ${className}`;
  const labelClass = className.includes("w-full")
    ? "min-w-0 flex-1 truncate"
    : "max-w-[12rem] truncate sm:max-w-[15rem]";
  if (opensPopover) {
    return (
      <span
        role="button"
        tabIndex={0}
        aria-expanded={ariaExpanded}
        aria-controls={ariaControls}
        className={rowClass}
        onClick={() => onClick()}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onClick();
          }
        }}
      >
        <input
          type="checkbox"
          checked={isOn}
          readOnly
          tabIndex={-1}
          aria-hidden
          className="hidden"
        />
        <FilterCheckboxBox isOn={isOn} />
        {children}
        <span className={labelClass} title={label}>
          {label}
        </span>
      </span>
    );
  }

  return (
    <label htmlFor={inputId} className={rowClass}>
      <input
        id={inputId}
        type="checkbox"
        checked={isOn}
        onChange={() => onClick()}
        className="hidden"
      />
      <FilterCheckboxBox isOn={isOn} />
      {children}
      <span className={labelClass} title={label}>
        {label}
      </span>
    </label>
  );
}

function ChipButton({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`${jetbrainsMono.className} px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide transition-colors sm:text-[12px] ${
        selected
          ? "text-white"
          : "bg-neutral-200 text-neutral-800 hover:bg-neutral-300/90"
      }`}
      style={selected ? { backgroundColor: HOPAMINE_BLUE } : undefined}
    >
      {label}
    </button>
  );
}

function toggleInList(list: string[], value: string): string[] {
  return list.includes(value)
    ? list.filter((item) => item !== value)
    : [...list, value];
}

type Props = {
  className?: string;
  /** Under the search field in the grey composer strip. */
  variant?: "default" | "composer";
  filters: ZimaSearchFilterState;
  onFiltersChange: (filters: ZimaSearchFilterState) => void;
};

/** Chip filters narrow the candidate set in the database before the model sees it. */
export function ZimaSearchFilters({
  className = "",
  variant = "default",
  filters,
  onFiltersChange,
}: Props) {
  const [interestsOpen, setInterestsOpen] = useState(false);
  const [archetypesOpen, setArchetypesOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const interestsPanelId = useId();
  const archetypesPanelId = useId();
  const locationPanelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inComposer = variant === "composer";

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      const root = rootRef.current;
      if (!root || root.contains(event.target as Node)) return;
      setInterestsOpen(false);
      setArchetypesOpen(false);
      setLocationOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  const archetypeButtonLabel =
    filters.archetypes.length === 1
      ? filters.archetypes[0]!
      : filters.archetypes.length > 1
        ? `Archetypes (${filters.archetypes.length})`
        : "Archetypes";
  const interestButtonLabel =
    filters.interests.length === 1
      ? filters.interests[0]!
      : filters.interests.length > 1
        ? `Interests (${filters.interests.length})`
        : "Interests";

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <div
        className={`flex flex-wrap items-center gap-1.5 ${
          inComposer ? "justify-start" : "justify-center sm:justify-start"
        }`}
        role="group"
        aria-label="Search filters"
      >
        <div className="relative">
          <button
            type="button"
            aria-haspopup="listbox"
            aria-expanded={locationOpen}
            aria-controls={locationPanelId}
            onClick={() => {
              setInterestsOpen(false);
              setArchetypesOpen(false);
              setLocationOpen((open) => !open);
            }}
            className={`${jetbrainsMono.className} inline-flex h-8 shrink-0 items-center gap-1 bg-transparent px-1 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-800 sm:text-[12px]`}
          >
            Location: {zimaSearchCityById(filters.city).label}
            <svg
              aria-hidden
              viewBox="0 0 12 12"
              className={`h-3 w-3 shrink-0 transition-transform ${locationOpen ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="square"
              strokeLinejoin="miter"
            >
              <path d="M2.5 4.5 6 8l3.5-3.5" />
            </svg>
          </button>
          {locationOpen ? (
            <ul
              id={locationPanelId}
              role="listbox"
              aria-label="Choose a city"
              className="absolute left-0 top-full z-50 mt-1 min-w-[12rem] border border-neutral-300 bg-white py-1 shadow-[0_4px_16px_rgba(0,0,0,0.12)]"
              onMouseDown={(event) => event.stopPropagation()}
            >
              {ZIMA_SEARCH_CITIES.map((city) => {
                const selected = filters.city === city.id;
                return (
                  <li key={city.id} role="option" aria-selected={selected}>
                    <button
                      type="button"
                      onClick={() => {
                        onFiltersChange({ ...filters, city: city.id });
                        setLocationOpen(false);
                      }}
                      className={`${jetbrainsMono.className} w-full px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide transition-colors sm:text-[12px] ${
                        selected
                          ? "text-white"
                          : "text-neutral-800 hover:bg-neutral-100"
                      }`}
                      style={
                        selected ? { backgroundColor: HOPAMINE_BLUE } : undefined
                      }
                    >
                      {city.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>

        <div className="relative">
          <FilterCheckbox
            label={archetypeButtonLabel}
            isOn={filters.archetypes.length > 0}
            opensPopover
            ariaExpanded={archetypesOpen}
            ariaControls={archetypesPanelId}
            onClick={() => {
              setLocationOpen(false);
              setInterestsOpen(false);
              setArchetypesOpen((open) => !open);
            }}
          />
          {archetypesOpen ? (
            <div
              id={archetypesPanelId}
              role="dialog"
              aria-label="Choose archetypes"
              className="absolute left-0 top-full z-50 mt-1 w-[min(28rem,calc(100vw-2rem))] border border-neutral-300 bg-white p-3 shadow-[0_4px_16px_rgba(0,0,0,0.12)]"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <p
                className={`${jetbrainsMono.className} mb-2 text-[10px] font-semibold uppercase tracking-wide text-neutral-600`}
              >
                Archetypes
              </p>
              <div className="grid max-h-52 grid-cols-2 gap-x-3 gap-y-0.5 overflow-y-auto">
                {ZIMA_ARCHETYPES.map((archetype) => (
                  <FilterCheckbox
                    key={archetype}
                    className="w-full"
                    label={archetype}
                    isOn={filters.archetypes.includes(archetype)}
                    onClick={() =>
                      onFiltersChange({
                        ...filters,
                        archetypes: toggleInList(filters.archetypes, archetype),
                      })
                    }
                  />
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="relative">
          <FilterCheckbox
            label={interestButtonLabel}
            isOn={filters.interests.length > 0}
            opensPopover
            ariaExpanded={interestsOpen}
            ariaControls={interestsPanelId}
            onClick={() => {
              setLocationOpen(false);
              setArchetypesOpen(false);
              setInterestsOpen((open) => !open);
            }}
          />
          {interestsOpen ? (
            <div
              id={interestsPanelId}
              role="dialog"
              aria-label="Choose interests"
              className="absolute left-0 top-full z-50 mt-1 w-[min(20rem,calc(100vw-2rem))] border border-neutral-300 bg-white p-3 shadow-[0_4px_16px_rgba(0,0,0,0.12)]"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <p
                className={`${jetbrainsMono.className} mb-2 text-[10px] font-semibold uppercase tracking-wide text-neutral-600`}
              >
                Interests
              </p>
              <div className="flex flex-wrap gap-1.5">
                {ZIMA_INTERESTS.map((interest) => (
                  <ChipButton
                    key={interest}
                    label={interest}
                    selected={filters.interests.includes(interest)}
                    onClick={() =>
                      onFiltersChange({
                        ...filters,
                        interests: toggleInList(filters.interests, interest),
                      })
                    }
                  />
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <FilterCheckbox
          label="Active"
          isOn={filters.activeOnly}
          onClick={() =>
            onFiltersChange({ ...filters, activeOnly: !filters.activeOnly })
          }
        />
      </div>
    </div>
  );
}
