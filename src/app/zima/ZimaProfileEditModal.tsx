"use client";

import { useMutation } from "convex/react";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { ProfileAvatarUpload } from "../../../components/profile/ProfileAvatarUpload";
import { api } from "../../../convex/_generated/api";
import { jetbrainsMono } from "../../../fonts";
import {
  ZIMA_ARCHETYPES,
  addZimaArchetype,
} from "../../../shared/zimaVocabulary";
import {
  ZimaAuthError,
  ZimaAuthField,
  ZimaAuthTextarea,
  zimaRoundedInputClass,
} from "./ZimaAuthUI";

const HOPAMINE_BLUE = "#00a6f3";
const TEXT_SAVE_DELAY_MS = 500;

type ProfileDraft = {
  name: string;
  username: string;
  bio: string;
  location: string;
  archetypes: string[];
};

function sameDraft(a: ProfileDraft, b: ProfileDraft) {
  return (
    a.name === b.name &&
    a.username === b.username &&
    a.bio === b.bio &&
    a.location === b.location &&
    a.archetypes.length === b.archetypes.length &&
    a.archetypes.every((item, index) => item === b.archetypes[index])
  );
}

export type ZimaProfileData = {
  name: string;
  username?: string;
  avatarUrl: string;
  bio?: string;
  location?: string;
  archetypes: string[];
};

type ZimaProfileEditModalProps = {
  user: ZimaProfileData;
  onClose: () => void;
};

function ZimaArchetypeField({
  value,
  draft,
  onDraftChange,
  onChange,
}: {
  value: string[];
  draft: string;
  onDraftChange: (draft: string) => void;
  onChange: (archetypes: string[]) => void;
}) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  const suggestions = useMemo(() => {
    const query = draft.trim().toLowerCase();
    const selected = new Set(value.map((item) => item.toLowerCase()));
    return ZIMA_ARCHETYPES.filter((option) => {
      if (selected.has(option.toLowerCase())) return false;
      if (!query) return true;
      return option.toLowerCase().includes(query);
    });
  }, [draft, value]);

  const typedLabel = draft.trim().replace(/\s+/g, " ");
  const canAddTyped =
    typedLabel.length > 0 &&
    !value.some((item) => item.toLowerCase() === typedLabel.toLowerCase()) &&
    !suggestions.some((option) => option.toLowerCase() === typedLabel.toLowerCase());

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  function add(label: string) {
    const next = addZimaArchetype(value, label);
    if (next.length !== value.length) onChange(next);
    onDraftChange("");
    setOpen(false);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      if (typedLabel) add(typedLabel);
      return;
    }
    if (event.key === "Escape") {
      if (open) {
        event.preventDefault();
        event.stopPropagation();
        setOpen(false);
      }
    }
  }

  return (
    <div ref={rootRef} className="space-y-2">
      <label
        htmlFor="zima-profile-archetype"
        className={`${jetbrainsMono.className} text-[11px] font-semibold uppercase tracking-wide text-neutral-700`}
      >
        Archetypes
      </label>
      {value.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {value.map((archetype) => (
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
      <div className="relative">
        <input
          id="zima-profile-archetype"
          value={draft}
          onChange={(event) => {
            onDraftChange(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Type an archetype"
          aria-label="Archetype"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="off"
          className={zimaRoundedInputClass}
        />
        {open && (suggestions.length > 0 || canAddTyped) ? (
          <ul
            id={listId}
            role="listbox"
            className="absolute z-20 mt-1 max-h-52 w-full overflow-y-auto rounded-xl border border-neutral-200 bg-white py-1 shadow-none"
          >
            {suggestions.map((option) => (
              <li key={option} role="option" aria-selected={false}>
                <button
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => add(option)}
                  className={`${jetbrainsMono.className} w-full px-5 py-2.5 text-left text-[14px] text-neutral-800 hover:bg-neutral-100`}
                >
                  {option}
                </button>
              </li>
            ))}
            {canAddTyped ? (
              <li role="option" aria-selected={false}>
                <button
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => add(typedLabel)}
                  className={`${jetbrainsMono.className} w-full px-5 py-2.5 text-left text-[14px] text-neutral-800 hover:bg-neutral-100`}
                >
                  Add “{typedLabel}”
                </button>
              </li>
            ) : null}
          </ul>
        ) : null}
      </div>
    </div>
  );
}

export function ZimaProfileEditModal({
  user,
  onClose,
}: ZimaProfileEditModalProps) {
  const updateProfile = useMutation(api.users.updateProfile);
  const [name, setName] = useState(user.name);
  const [username, setUsername] = useState(user.username ?? "");
  const [bio, setBio] = useState(user.bio ?? "");
  const [location, setLocation] = useState(user.location ?? "");
  const [archetypes, setArchetypes] = useState(user.archetypes);
  const [archetypeDraft, setArchetypeDraft] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const savedDraft = useRef<ProfileDraft>({
    name: user.name,
    username: user.username ?? "",
    bio: user.bio ?? "",
    location: user.location ?? "",
    archetypes: user.archetypes,
  });
  const draftRef = useRef<ProfileDraft>(savedDraft.current);
  const archetypeDraftRef = useRef(archetypeDraft);
  const timerRef = useRef<number | null>(null);
  const saveChain = useRef(Promise.resolve());
  const closeLock = useRef(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const draft: ProfileDraft = { name, username, bio, location, archetypes };
  draftRef.current = draft;
  archetypeDraftRef.current = archetypeDraft;

  const persistDraft = useCallback(
    async (snapshot: ProfileDraft) => {
      if (!snapshot.name.trim()) {
        setError("Name is required.");
        setSaved(false);
        return false;
      }

      setSaving(true);
      setSaved(false);
      try {
        await updateProfile({
          name: snapshot.name.trim(),
          username: snapshot.username.trim() || undefined,
          bio: snapshot.bio.trim() || undefined,
          location: snapshot.location.trim() || undefined,
          archetypes: snapshot.archetypes,
          skills: snapshot.archetypes,
        });
        savedDraft.current = snapshot;
        setError("");
        setSaved(true);
        return true;
      } catch (submitError) {
        setError(
          submitError instanceof Error
            ? submitError.message
            : "Failed to save profile.",
        );
        setSaved(false);
        return false;
      } finally {
        setSaving(false);
      }
    },
    [updateProfile],
  );

  const enqueueSave = useCallback((commitArchetype = false) => {
    let savedOk = true;
    const task = saveChain.current.then(async () => {
      const current = draftRef.current;
      const nextArchetypes = commitArchetype
        ? addZimaArchetype(current.archetypes, archetypeDraftRef.current)
        : current.archetypes;
      const snapshot =
        nextArchetypes === current.archetypes
          ? current
          : { ...current, archetypes: nextArchetypes };
      if (
        commitArchetype &&
        nextArchetypes.length !== current.archetypes.length
      ) {
        setArchetypes(nextArchetypes);
        setArchetypeDraft("");
        draftRef.current = snapshot;
        archetypeDraftRef.current = "";
      }
      if (sameDraft(snapshot, savedDraft.current)) return;
      savedOk = await persistDraft(snapshot);
    });
    saveChain.current = task.then(
      () => undefined,
      () => undefined,
    );
    return task.then(() => savedOk);
  }, [persistDraft]);

  const requestClose = useCallback(() => {
    if (closeLock.current) return;
    closeLock.current = true;

    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    const pending = addZimaArchetype(
      draftRef.current.archetypes,
      archetypeDraftRef.current,
    );
    const snapshot =
      pending.length === draftRef.current.archetypes.length
        ? draftRef.current
        : { ...draftRef.current, archetypes: pending };

    if (!snapshot.name.trim() || sameDraft(snapshot, savedDraft.current)) {
      onCloseRef.current();
      return;
    }

    void enqueueSave(true).then((savedOk) => {
      if (!savedOk) {
        closeLock.current = false;
        return;
      }
      onCloseRef.current();
    });
  }, [enqueueSave]);

  useEffect(() => {
    const current = draftRef.current;
    if (sameDraft(current, savedDraft.current)) return;

    setSaved(false);
    setError("");
    const textDirty =
      current.name !== savedDraft.current.name ||
      current.username !== savedDraft.current.username ||
      current.bio !== savedDraft.current.bio ||
      current.location !== savedDraft.current.location;

    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      void enqueueSave();
    }, textDirty ? TEXT_SAVE_DELAY_MS : 0);

    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [archetypes, bio, enqueueSave, location, name, username]);

  useEffect(() => {
    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") requestClose();
    }

    document.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [requestClose]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (!draftRef.current.name.trim()) {
      setError("Name is required.");
      setSaved(false);
      return;
    }
    void enqueueSave(true).then((savedOk) => {
      if (savedOk) onCloseRef.current();
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={requestClose}
      role="presentation"
    >
      <div
        className="flex w-full max-w-md max-h-[min(90dvh,720px)] flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-none"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Edit profile"
      >
        <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
          <h2
            className={`${jetbrainsMono.className} text-[13px] font-semibold uppercase tracking-wide text-neutral-900`}
          >
            Edit profile
          </h2>
          <div
            className={`flex items-center ${saving || saved ? "gap-4" : ""}`}
          >
            <p
              aria-live="polite"
              className={`${jetbrainsMono.className} text-[11px] font-semibold uppercase tracking-wide text-neutral-400`}
            >
              {saving ? "Saving…" : saved ? "Saved" : ""}
            </p>
            <button
              type="button"
              onClick={requestClose}
              aria-label="Close"
              className={`${jetbrainsMono.className} text-[13px] font-semibold uppercase tracking-wide text-neutral-500 transition-colors hover:text-neutral-900`}
            >
              Close
            </button>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex flex-1 flex-col overflow-hidden"
        >
          <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
            {error ? <ZimaAuthError message={error} /> : null}

            <div className="flex justify-start">
              <ProfileAvatarUpload
                avatarUrl={user.avatarUrl}
                name={name}
                size={96}
                variant="light"
                controls="link"
                pickerLabel="Change profile"
                shape="circle"
                dithered={false}
              />
            </div>

            <ZimaAuthField
              id="zima-profile-name"
              label="Name"
              variant="rounded"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Your name"
              autoComplete="name"
            />

            <ZimaAuthField
              id="zima-profile-username"
              label="Username"
              variant="rounded"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="hopamine-handle"
              autoComplete="username"
            />

            <ZimaAuthField
              id="zima-profile-location"
              label="Location"
              variant="rounded"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              placeholder="City, country"
              autoComplete="address-level2"
            />

            <ZimaAuthTextarea
              id="zima-profile-bio"
              label="Bio"
              variant="rounded"
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              placeholder="A short intro about you…"
              rows={4}
            />

            <ZimaArchetypeField
              value={archetypes}
              draft={archetypeDraft}
              onDraftChange={setArchetypeDraft}
              onChange={setArchetypes}
            />
          </div>

          <div className="border-t border-neutral-200 px-5 py-4">
            <button
              type="submit"
              disabled={saving}
              className={`${jetbrainsMono.className} flex h-12 w-full items-center justify-center rounded-xl px-6 text-[15px] font-semibold uppercase tracking-wide text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40`}
              style={{ backgroundColor: HOPAMINE_BLUE }}
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
