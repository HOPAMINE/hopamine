"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { HACKATHON_FIELDS, type HackathonField } from "@/lib/hackathonDirectory";
import { robotoMono } from "../../fonts";
import { ProjectMemberPicker } from "./ProjectMemberPicker";

type AddProjectFormProps = {
  onCancel: () => void;
  onCreated: () => void;
  variant?: "dark" | "light";
};

function FieldLabel({
  htmlFor,
  children,
  variant,
}: {
  htmlFor: string;
  children: React.ReactNode;
  variant: "dark" | "light";
}) {
  return (
    <label
      htmlFor={htmlFor}
      className={`${robotoMono.className} mb-1.5 block text-xs font-semibold uppercase tracking-wide ${
        variant === "light" ? "text-neutral-500" : "text-white/75"
      }`}
    >
      {children}
    </label>
  );
}

const fieldOptions = Object.keys(HACKATHON_FIELDS) as HackathonField[];

export function AddProjectForm({ onCancel, onCreated, variant = "dark" }: AddProjectFormProps) {
  const createProject = useMutation(api.projects.create);

  const [field, setField] = useState<HackathonField>("Civic");
  const [title, setTitle] = useState("");
  const [blurb, setBlurb] = useState("");
  const [location, setLocation] = useState("");
  const [liveUrl, setLiveUrl] = useState("");
  const [inviteUserIds, setInviteUserIds] = useState<Id<"users">[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const inputClassName =
    variant === "light"
      ? `${robotoMono.className} w-full rounded-sm border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-[#00a6f3] focus:outline-none`
      : `${robotoMono.className} w-full rounded-sm border border-white/35 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-white focus:outline-none`;

  const textareaClassName = `${inputClassName} min-h-[88px] resize-y`;

  const primaryButtonClass =
    variant === "light"
      ? `${robotoMono.className} inline-flex items-center rounded-full border border-[#00a6f3] bg-[#00a6f3] px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-white transition-colors hover:bg-[#0096dc] disabled:opacity-40`
      : `${robotoMono.className} inline-flex items-center rounded-full border border-white/35 bg-white px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-accent-events transition-colors hover:bg-white/90 disabled:opacity-40`;

  const secondaryButtonClass =
    variant === "light"
      ? `${robotoMono.className} inline-flex items-center rounded-full border border-neutral-300 bg-white px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-700 transition-colors hover:border-neutral-400 hover:bg-neutral-50 disabled:opacity-40`
      : `${robotoMono.className} inline-flex items-center rounded-full border border-white/35 bg-accent-events px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-white transition-colors hover:bg-white hover:text-accent-events disabled:opacity-40`;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;

    const trimmedTitle = title.trim();
    const trimmedBlurb = blurb.trim();

    if (!trimmedTitle) {
      setError("Project title is required.");
      return;
    }

    if (!trimmedBlurb) {
      setError("Project description is required.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      await createProject({
        field,
        title: trimmedTitle,
        blurb: trimmedBlurb,
        location: location.trim() || undefined,
        liveUrl: liveUrl.trim() || undefined,
        inviteUserIds,
      });
      onCreated();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create project.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-5">
      <div>
        <FieldLabel htmlFor="project-title" variant={variant}>
          Title
        </FieldLabel>
        <input
          id="project-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={inputClassName}
          placeholder="Project name"
          maxLength={120}
          required
        />
      </div>

      <div>
        <FieldLabel htmlFor="project-field" variant={variant}>
          Field
        </FieldLabel>
        <select
          id="project-field"
          value={field}
          onChange={(e) => setField(e.target.value as HackathonField)}
          className={inputClassName}
        >
          {fieldOptions.map((option) => (
            <option
              key={option}
              value={option}
              className={variant === "light" ? "bg-white text-neutral-900" : "bg-accent-events text-white"}
            >
              {HACKATHON_FIELDS[option]}
            </option>
          ))}
        </select>
      </div>

      <div>
        <FieldLabel htmlFor="project-blurb" variant={variant}>
          Description
        </FieldLabel>
        <textarea
          id="project-blurb"
          value={blurb}
          onChange={(e) => setBlurb(e.target.value)}
          className={textareaClassName}
          placeholder="What are you building?"
          maxLength={500}
          required
        />
      </div>

      <div>
        <FieldLabel htmlFor="project-location" variant={variant}>
          Based in
        </FieldLabel>
        <input
          id="project-location"
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className={inputClassName}
          placeholder="City"
          maxLength={80}
        />
      </div>

      <div>
        <FieldLabel htmlFor="project-live-url" variant={variant}>
          Live URL
        </FieldLabel>
        <input
          id="project-live-url"
          type="url"
          value={liveUrl}
          onChange={(e) => setLiveUrl(e.target.value)}
          className={inputClassName}
          placeholder="https://yourproject.com"
        />
      </div>

      <div>
        <FieldLabel htmlFor="project-members" variant={variant}>
          Invite builders
        </FieldLabel>
        <ProjectMemberPicker selectedIds={inviteUserIds} onChange={setInviteUserIds} variant={variant} />
      </div>

      {error ? (
        <p
          className={`${robotoMono.className} text-sm ${variant === "light" ? "text-red-600" : "text-red-200"}`}
          role="alert"
        >
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={saving} className={primaryButtonClass}>
          {saving ? "Creating…" : "Create project"}
        </button>
        <button type="button" onClick={onCancel} disabled={saving} className={secondaryButtonClass}>
          Cancel
        </button>
      </div>
    </form>
  );
}
