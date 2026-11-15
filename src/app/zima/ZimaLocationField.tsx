"use client";

import { useState } from "react";
import type { WorldCity } from "../../../shared/cityPrefixSearch";
import { jetbrainsMono } from "../../../fonts";
import { useWorldCitySuggestions } from "./useWorldCitySuggestions";
import { zimaRoundedInputClass } from "./ZimaAuthUI";

function formatCityLabel(city: WorldCity) {
  return `${city.name}, ${city.country}`;
}

type ZimaLocationFieldProps = {
  id: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

export function ZimaLocationField({
  id,
  label = "Location",
  value,
  onChange,
  placeholder = "Type your city…",
}: ZimaLocationFieldProps) {
  const [listOpen, setListOpen] = useState(false);
  const { suggestions } = useWorldCitySuggestions(value);
  const showSuggestions = listOpen && suggestions.length > 0;

  function pickCity(city: WorldCity) {
    onChange(formatCityLabel(city));
    setListOpen(false);
  }

  return (
    <div className="space-y-2">
      <label
        htmlFor={id}
        className={`${jetbrainsMono.className} text-[11px] font-semibold uppercase tracking-wide text-neutral-700`}
      >
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type="text"
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
            setListOpen(true);
          }}
          onFocus={() => setListOpen(true)}
          onBlur={() => {
            window.setTimeout(() => setListOpen(false), 120);
          }}
          placeholder={placeholder}
          autoComplete="address-level2"
          aria-autocomplete="list"
          aria-expanded={showSuggestions}
          className={zimaRoundedInputClass}
        />
        {showSuggestions ? (
          <ul
            role="listbox"
            aria-label="Cities"
            className="absolute left-0 right-0 top-full z-40 mt-1 max-h-56 overflow-y-auto rounded-2xl border border-neutral-200 bg-white py-1 shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
          >
            {suggestions.map((city) => (
              <li key={`${city.folded}-${city.country}-${city.lat}`}>
                <button
                  type="button"
                  role="option"
                  className={`${jetbrainsMono.className} flex w-full items-baseline justify-between gap-3 px-4 py-2.5 text-left text-[13px] text-neutral-800 transition-colors hover:bg-[#f0f9ff]`}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => pickCity(city)}
                >
                  <span className="min-w-0 truncate font-semibold">
                    {city.name}
                  </span>
                  <span className="shrink-0 text-[11px] uppercase tracking-wide text-neutral-500">
                    {city.country}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
