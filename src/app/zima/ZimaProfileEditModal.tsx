"use client";

import { useMutation } from "convex/react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { ProfileAvatarUpload } from "../../../components/profile/ProfileAvatarUpload";
import { api } from "../../../convex/_generated/api";
import { jetbrainsMono } from "../../../fonts";
import {
  ZimaAuthError,
  ZimaAuthField,
  ZimaAuthTextarea,
} from "./ZimaAuthUI";
import { ZimaArchetypePicker } from "./ZimaArchetypePicker";
import { ZimaLocationField } from "./ZimaLocationField";
import { ZimaSkillsField } from "./ZimaSkillsField";

const HOPAMINE_BLUE = "#00a6f3";
const TEXT_SAVE_DELAY_MS = 500;

type ProfileDraft = {
  name: string;
  username: string;
  bio: string;
  location: string;
  archetypes: string[];
  skills: string[];
};

function sameList(a: readonly string[], b: readonly string[]) {
  return a.length === b.length && a.every((item, index) => item === b[index]);
}

function sameDraft(a: ProfileDraft, b: ProfileDraft) {
  return (
    a.name === b.name &&
    a.username === b.username &&
    a.bio === b.bio &&
    a.location === b.location &&
    sameList(a.archetypes, b.archetypes) &&
    sameList(a.skills, b.skills)
  );
}

export type ZimaProfileData = {
  name: string;
  username?: string;
  avatarUrl: string;
  bio?: string;
  location?: string;
  archetypes: string[];
  /** Freeform skills the user adds (not archetype labels). */
  skills: string[];
};

type ZimaProfileEditModalProps = {
  user: ZimaProfileData;
  onClose: () => void;
};

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
  const [skills, setSkills] = useState(user.skills);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const savedDraft = useRef<ProfileDraft>({
    name: user.name,
    username: user.username ?? "",
    bio: user.bio ?? "",
    location: user.location ?? "",
    archetypes: user.archetypes,
    skills: user.skills,
  });
  const draftRef = useRef<ProfileDraft>(savedDraft.current);
  const timerRef = useRef<number | null>(null);
  const saveChain = useRef(Promise.resolve());
  const closeLock = useRef(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const draft: ProfileDraft = {
    name,
    username,
    bio,
    location,
    archetypes,
    skills,
  };
  draftRef.current = draft;

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
          skills: snapshot.skills,
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

  const enqueueSave = useCallback(() => {
    let savedOk = true;
    const task = saveChain.current.then(async () => {
      const snapshot = draftRef.current;
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

    const snapshot = draftRef.current;

    if (!snapshot.name.trim() || sameDraft(snapshot, savedDraft.current)) {
      onCloseRef.current();
      return;
    }

    void enqueueSave().then((savedOk) => {
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
  }, [archetypes, bio, enqueueSave, location, name, skills, username]);

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
    void enqueueSave().then((savedOk) => {
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

            <ZimaLocationField
              id="zima-profile-location"
              value={location}
              onChange={setLocation}
              placeholder="Type your city…"
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

            <ZimaSkillsField
              id="zima-profile-skills"
              value={skills}
              onChange={setSkills}
            />

            <ZimaArchetypePicker
              id="zima-profile-archetypes"
              value={archetypes}
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