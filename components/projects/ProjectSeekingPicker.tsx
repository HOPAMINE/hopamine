"use client";

import {
  PROJECT_SEEKING_CONTRIBUTORS_LABEL,
  PROJECT_SEEKING_HIRE_LABEL,
} from "../../shared/projectSeeking";
import { jetbrainsMono, robotoMono } from "../../fonts";

type ProjectSeekingPickerProps = {
  lookingForContributors: boolean;
  lookingToHire: boolean;
  onLookingForContributorsChange: (value: boolean) => void;
  onLookingToHireChange: (value: boolean) => void;
  variant?: "dark" | "light" | "onboard";
};

const OPTIONS = [
  {
    key: "contributors" as const,
    label: PROJECT_SEEKING_CONTRIBUTORS_LABEL,
  },
  {
    key: "hire" as const,
    label: PROJECT_SEEKING_HIRE_LABEL,
  },
] as const;

export function ProjectSeekingPicker({
  lookingForContributors,
  lookingToHire,
  onLookingForContributorsChange,
  onLookingToHireChange,
  variant = "light",
}: ProjectSeekingPickerProps) {
  const selected = {
    contributors: lookingForContributors,
    hire: lookingToHire,
  };

  function toggle(key: "contributors" | "hire") {
    if (key === "contributors") {
      onLookingForContributorsChange(!lookingForContributors);
      return;
    }
    onLookingToHireChange(!lookingToHire);
  }

  if (variant === "onboard") {
    return (
      <div className="flex flex-col gap-3">
        {OPTIONS.map((option) => {
          const isSelected = selected[option.key];
          return (
            <button
              key={option.key}
              type="button"
              onClick={() => toggle(option.key)}
              aria-pressed={isSelected}
              className={`${jetbrainsMono.className} flex min-h-12 w-full items-center justify-center rounded-xl px-4 py-3 text-center text-[13px] font-semibold uppercase tracking-wide leading-tight transition-colors ${
                isSelected
                  ? "border border-transparent bg-[#00a6f3] text-white"
                  : "border border-neutral-200 bg-white text-neutral-900"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    );
  }

  const mono = robotoMono.className;
  const isLight = variant === "light";

  return (
    <div className="flex flex-col gap-2">
      {OPTIONS.map((option) => {
        const isSelected = selected[option.key];
        const id = `project-seeking-${option.key}`;
        return (
          <label
            key={option.key}
            htmlFor={id}
            className={`${mono} flex cursor-pointer items-center gap-3 rounded-sm border px-3 py-2.5 text-sm transition-colors ${
              isLight
                ? isSelected
                  ? "border-[#00a6f3] bg-[#00a6f3]/8 text-neutral-900"
                  : "border-neutral-200 bg-white text-neutral-800 hover:border-neutral-300"
                : isSelected
                  ? "border-white bg-white/15 text-white"
                  : "border-white/35 bg-white/10 text-white/85 hover:border-white/55"
            }`}
          >
            <input
              id={id}
              type="checkbox"
              checked={isSelected}
              onChange={() => toggle(option.key)}
              className="h-4 w-4 accent-[#00a6f3]"
            />
            <span className="font-semibold uppercase tracking-wide">
              {option.label}
            </span>
          </label>
        );
      })}
    </div>
  );
}
