"use client";

import { useState } from "react";
import { jetbrainsMono } from "../../../fonts";
import { ZIMA_STORY_ARCHETYPES } from "../../../shared/zimaVocabulary";

const HOPAMINE_BLUE = "#00a6f3";

const storyLabels = new Set<string>(
  ZIMA_STORY_ARCHETYPES.map((option) => option.label),
);

type ZimaArchetypePickerProps = {
  value: readonly string[];
  onChange: (archetypes: string[]) => void;
  /** Optional field label; omit when a parent already renders one. */
  label?: string;
  id?: string;
};

export function ZimaArchetypePicker({
  value,
  onChange,
  label = "Archetypes",
  id,
}: ZimaArchetypePickerProps) {
  const legacySelected = value.filter((item) => !storyLabels.has(item));
  const storySelected = ZIMA_STORY_ARCHETYPES.filter((option) =>
    value.includes(option.label),
  );
  const hasSelection = storySelected.length > 0 || legacySelected.length > 0;
  const [picking, setPicking] = useState(!hasSelection);
  const showAll = picking || !hasSelection;
  const options = showAll ? ZIMA_STORY_ARCHETYPES : storySelected;

  function toggle(labelName: string) {
    onChange(
      value.includes(labelName)
        ? value.filter((item) => item !== labelName)
        : [...value, labelName],
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        {label ? (
          <p
            id={id}
            className={`${jetbrainsMono.className} text-[11px] font-semibold uppercase tracking-wide text-neutral-700`}
          >
            {label}
          </p>
        ) : (
          <span />
        )}
        {hasSelection ? (
          <button
            type="button"
            onClick={() => setPicking((current) => !current)}
            className={`${jetbrainsMono.className} text-[11px] font-semibold uppercase tracking-wide text-[#00a6f3] transition-opacity hover:opacity-80`}
          >
            {showAll ? "Done" : "Change"}
          </button>
        ) : null}
      </div>
      {legacySelected.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {legacySelected.map((archetype) => (
            <li key={archetype}>
              <button
                type="button"
                onClick={() =>
                  onChange(value.filter((item) => item !== archetype))
                }
                className={`${jetbrainsMono.className} inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-semibold uppercase tracking-wide text-white`}
                style={{ backgroundColor: HOPAMINE_BLUE }}
                aria-label={`Remove ${archetype}`}
              >
                {archetype}
                <span aria-hidden>×</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="flex flex-col gap-3">
        {options.map((option) => {
          const selected = value.includes(option.label);
          return (
            <button
              key={option.label}
              type="button"
              onClick={() => toggle(option.label)}
              aria-pressed={selected}
              className={`flex w-full flex-col items-start gap-1 rounded-xl border px-4 py-3 text-left transition-colors ${
                selected
                  ? "border-transparent bg-[#00a6f3] text-white"
                  : "border-neutral-200 bg-white text-neutral-900"
              }`}
            >
              <span
                className={`${jetbrainsMono.className} text-[14px] font-semibold uppercase tracking-wide`}
              >
                {option.emoji} {option.label}
              </span>
              <span
                className={`${jetbrainsMono.className} text-[13px] leading-snug ${
                  selected ? "text-white/90" : "text-neutral-600"
                }`}
              >
                {option.description}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}