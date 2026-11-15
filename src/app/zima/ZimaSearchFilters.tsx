"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import {
  ZIMA_INTERESTS,
  ZIMA_STORY_ARCHETYPES,
} from "../../../shared/zimaVocabulary";
import { jetbrainsMono } from "../../../fonts";
import {
  useZimaSearchChrome,
  type ZimaMapLayerId,
} from "./ZimaSearchChromeContext";
import type { ZimaSearchFilterState } from "./useZimaSearch";

const HOPAMINE_BLUE = "#00a6f3";

const MAP_LAYER_PILLS: readonly { id: ZimaMapLayerId; label: string }[] = [
  { id: "people", label: "People" },
  { id: "projects", label: "Projects" },
  { id: "events", label: "Events" },
];

function MapLayerIcon({ layer }: { layer: ZimaMapLayerId }) {
  if (layer === "people") {
    return (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <circle cx="12" cy="8" r="3.5" />
        <path d="M5.5 19.5c1.5-3.5 3.8-5 6.5-5s5 1.5 6.5 5" />
      </svg>
    );
  }
  if (layer === "projects") {
    return (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M12 21v-9" />
        <path d="M12 12c0-4 3-7 7-7 0 4-3 7-7 7z" />
        <path d="M12 15c0-3-2.5-5-5.5-5 0 3 2.5 5 5.5 5z" />
      </svg>
    );
  }
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18" />
      <path d="M8 3v4" />
      <path d="M16 3v4" />
    </svg>
  );
}

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
  titleHint,
}: {
  label: string;
  isOn: boolean;
  onClick: () => void;
  children?: ReactNode;
  ariaExpanded?: boolean;
  ariaControls?: string;
  opensPopover?: boolean;
  className?: string;
  /** Tooltip text; defaults to `label`. */
  titleHint?: string;
}) {
  const tooltip = titleHint ?? label;
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
        <span className={labelClass} title={tooltip}>
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
      <span className={labelClass} title={tooltip}>
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

function MapLayerPill({
  label,
  selected,
  onClick,
  children,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={selected}
      title={label}
      onClick={onClick}
      className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-colors ${
        selected
          ? "border-transparent text-white"
          : "border-neutral-200 bg-white text-neutral-500 hover:border-neutral-300 hover:text-neutral-700"
      }`}
      style={selected ? { backgroundColor: HOPAMINE_BLUE } : undefined}
    >
      {children}
    </button>
  );
}

/** Chip filters narrow the candidate set in the database before the model sees it. */
export function ZimaSearchFilters({
  className = "",
  variant = "default",
  filters,
  onFiltersChange,
}: Props) {
  const { mapLayers, toggleMapLayer } = useZimaSearchChrome();
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [interestsOpen, setInterestsOpen] = useState(false);
  const [archetypesOpen, setArchetypesOpen] = useState(false);
  const filtersPanelId = useId();
  const interestsPanelId = useId();
  const archetypesPanelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inComposer = variant === "composer";

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      const root = rootRef.current;
      if (!root || root.contains(event.target as Node)) return;
      setInterestsOpen(false);
      setArchetypesOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  const activeFilterCount =
    filters.archetypes.length +
    filters.interests.length +
    (filters.activeOnly ? 1 : 0);

  const archetypeButtonLabel = (() => {
    if (filters.archetypes.length === 0) return "Archetypes";
    if (filters.archetypes.length > 1) {
      return `Archetypes (${filters.archetypes.length})`;
    }
    const selected = filters.archetypes[0]!;
    const match = ZIMA_STORY_ARCHETYPES.find(
      (option) => option.label === selected,
    );
    return match ? `${match.emoji} ${match.label}` : selected;
  })();
  const interestButtonLabel =
    filters.interests.length === 1
      ? filters.interests[0]!
      : filters.interests.length > 1
        ? `Interests (${filters.interests.length})`
        : "Interests";

  function toggleFiltersVisible() {
    setFiltersVisible((open) => {
      if (open) {
        setInterestsOpen(false);
        setArchetypesOpen(false);
      }
      return !open;
    });
  }

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <div
        className={`flex flex-wrap items-center gap-1.5 ${
          inComposer ? "justify-start" : "justify-center sm:justify-start"
        }`}
        role="group"
        aria-label="Search filters"
      >
        <div
          className="flex items-center gap-1"
          role="group"
          aria-label="Map layers"
        >
          {MAP_LAYER_PILLS.map((layer) => (
            <MapLayerPill
              key={layer.id}
              label={layer.label}
              selected={mapLayers[layer.id]}
              onClick={() => toggleMapLayer(layer.id)}
            >
              <MapLayerIcon layer={layer.id} />
            </MapLayerPill>
          ))}
        </div>

        <span
          aria-hidden
          className="mx-0.5 hidden h-4 w-px bg-neutral-300 sm:inline-block"
        />

        <button
          type="button"
          aria-expanded={filtersVisible}
          aria-controls={filtersPanelId}
          onClick={toggleFiltersVisible}
          className={`${jetbrainsMono.className} inline-flex h-8 shrink-0 items-center gap-1.5 px-1 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-700 transition-colors hover:text-neutral-900 sm:text-[12px]`}
        >
          Filters
          {activeFilterCount > 0 ? (
            <span
              className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-[10px] font-semibold text-white"
              style={{ backgroundColor: HOPAMINE_BLUE }}
            >
              {activeFilterCount}
            </span>
          ) : null}
          <svg
            aria-hidden
            viewBox="0 0 12 12"
            className={`h-3 w-3 transition-transform ${filtersVisible ? "rotate-90" : ""}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="square"
          >
            <path d="M4.5 2.5 8 6 4.5 9.5" />
          </svg>
        </button>

        {filtersVisible ? (
          <div id={filtersPanelId} className="flex flex-wrap items-center gap-1.5">
            <div className="relative">
              <FilterCheckbox
                label={archetypeButtonLabel}
                isOn={filters.archetypes.length > 0}
                opensPopover
                ariaExpanded={archetypesOpen}
                ariaControls={archetypesPanelId}
                onClick={() => {
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
                  <div className="grid max-h-64 grid-cols-1 gap-y-0.5 overflow-y-auto sm:grid-cols-2">
                    {ZIMA_STORY_ARCHETYPES.map((archetype) => (
                      <FilterCheckbox
                        key={archetype.label}
                        className="w-full"
                        label={`${archetype.emoji} ${archetype.label}`}
                        titleHint={archetype.description}
                        isOn={filters.archetypes.includes(archetype.label)}
                        onClick={() =>
                          onFiltersChange({
                            ...filters,
                            archetypes: toggleInList(
                              filters.archetypes,
                              archetype.label,
                            ),
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
        ) : null}
      </div>
    </div>
  );
}
