"use client";

import { useState, type KeyboardEvent } from "react";
import { jetbrainsMono } from "../../../fonts";
import { zimaRoundedInputClass } from "./ZimaAuthUI";

type ZimaSkillsFieldProps = {
  id?: string;
  value: readonly string[];
  onChange: (skills: string[]) => void;
};

export function ZimaSkillsField({
  id = "zima-profile-skills",
  value,
  onChange,
}: ZimaSkillsFieldProps) {
  const [draft, setDraft] = useState("");

  function addSkill(raw: string) {
    const trimmed = raw.trim().replace(/\s+/g, " ");
    if (!trimmed) return;
    if (value.some((item) => item.toLowerCase() === trimmed.toLowerCase())) {
      setDraft("");
      return;
    }
    onChange([...value, trimmed]);
    setDraft("");
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      addSkill(draft);
    }
  }

  return (
    <div className="space-y-2">
      <label
        htmlFor={id}
        className={`${jetbrainsMono.className} text-[11px] font-semibold uppercase tracking-wide text-neutral-700`}
      >
        Skills
      </label>
      {value.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {value.map((skill) => (
            <li key={skill}>
              <button
                type="button"
                onClick={() =>
                  onChange(value.filter((item) => item !== skill))
                }
                className={`${jetbrainsMono.className} inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-[12px] font-semibold uppercase tracking-wide text-neutral-800 transition-colors hover:border-neutral-300 hover:bg-white`}
                aria-label={`Remove ${skill}`}
              >
                {skill}
                <span aria-hidden>×</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="flex gap-2">
        <input
          id={id}
          type="text"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Add a skill"
          maxLength={40}
          className={`${zimaRoundedInputClass} min-w-0 flex-1`}
        />
        <button
          type="button"
          onClick={() => addSkill(draft)}
          disabled={!draft.trim()}
          className={`${jetbrainsMono.className} shrink-0 rounded-xl border border-neutral-300 bg-white px-4 text-[12px] font-semibold uppercase tracking-wide text-neutral-800 transition-colors hover:border-[#00a6f3] hover:text-[#00a6f3] disabled:cursor-not-allowed disabled:opacity-40`}
        >
          Add
        </button>
      </div>
    </div>
  );
}
