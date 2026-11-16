"use client";

import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Suspense,
  useEffect,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { ProjectMemberPicker } from "../../../components/projects/ProjectMemberPicker";
import { ProjectSeekingPicker } from "../../../components/projects/ProjectSeekingPicker";
import {
  HACKATHON_FIELDS,
  type HackathonField,
} from "@/lib/hackathonDirectory";
import {
  getProjectOnboardingReturnPath,
} from "@/lib/projectOnboarding";
import { jetbrainsMono, newsreader } from "../../../fonts";
import {
  ZimaAuthError,
  zimaRoundedInputClass as inputClass,
  zimaRoundedTextareaClass as textareaClass,
} from "@/app/zima/ZimaAuthUI";

const HOPAMINE_BLUE = "#00a6f3";

const STEP_TITLE = 0;
const STEP_FIELD = 1;
const STEP_BLURB = 2;
const STEP_LOCATION = 3;
const STEP_LIVE_URL = 4;
const STEP_SEEKING = 5;
const STEP_INVITES = 6;
const LAST_STEP = STEP_INVITES;
const STEP_COUNT = LAST_STEP + 1;

const fieldOptions = Object.keys(HACKATHON_FIELDS) as HackathonField[];

const onboardButtonClass = `${jetbrainsMono.className} text-[15px] font-semibold uppercase tracking-wide`;

function ContinueButton({
  disabled,
  label,
}: {
  disabled: boolean;
  label: string;
}) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className={`${onboardButtonClass} flex h-12 w-full items-center justify-center rounded-xl px-6 text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-40`}
      style={{ backgroundColor: HOPAMINE_BLUE }}
    >
      {label}
    </button>
  );
}

function OptionalStepHint() {
  return (
    <p className={`${jetbrainsMono.className} text-[13px] text-neutral-500`}>
      Optional — you can skip and add this later.
    </p>
  );
}

function OptionalStepFooter({
  canContinue,
  onSkip,
  continueLabel = "Continue",
}: {
  canContinue: boolean;
  onSkip: () => void;
  continueLabel?: string;
}) {
  return (
    <div className="space-y-3">
      <ContinueButton disabled={!canContinue} label={continueLabel} />
      <button
        type="button"
        onClick={onSkip}
        className={`${onboardButtonClass} flex h-12 w-full items-center justify-center rounded-xl border border-neutral-200 bg-white px-6 text-neutral-900 transition-colors hover:bg-neutral-50`}
      >
        Skip for now
      </button>
    </div>
  );
}

function ProgressHeader({
  step,
  onBack,
  onExit,
}: {
  step: number;
  onBack: () => void;
  onExit: () => void;
}) {
  const progressPercent = ((step + 1) / STEP_COUNT) * 100;

  return (
    <header className="relative z-40 shrink-0 border-b border-neutral-200/80 bg-white">
      <div className="mx-auto flex w-full max-w-lg items-center gap-3 py-4 pl-[max(0px,env(safe-area-inset-left))] pr-[max(16px,env(safe-area-inset-right))] pt-[max(16px,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={step === STEP_TITLE ? onExit : onBack}
          aria-label={step === STEP_TITLE ? "Leave project setup" : "Go back"}
          className={`${onboardButtonClass} -ml-1 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-neutral-200 bg-white text-neutral-900 shadow-sm transition-colors hover:bg-neutral-50`}
        >
          <svg
            aria-hidden
            viewBox="0 0 16 16"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.25"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M10 3 5 8l5 5" />
          </svg>
        </button>
        <div
          className="h-4 min-w-0 flex-1 overflow-hidden rounded-full bg-neutral-200"
          role="progressbar"
          aria-valuenow={progressPercent}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full rounded-full bg-[#00a6f3] transition-[width] duration-300 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
    </header>
  );
}

function StepForm({
  title,
  onSubmit,
  children,
  footer,
  centerContent = false,
}: {
  title: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  children: ReactNode;
  footer: ReactNode;
  centerContent?: boolean;
}) {
  return (
    <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
      <h1
        className={`mt-4 shrink-0 text-balance ${newsreader.className} text-[32px] font-normal leading-[1.12] tracking-[-0.02em] text-[#00a6f3] ${
          centerContent ? "text-center" : ""
        }`}
      >
        {title}
      </h1>
      <div
        className={`mt-5 flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto ${
          centerContent
            ? "mx-auto w-full max-w-sm text-center [&_input]:text-center"
            : ""
        }`}
      >
        {children}
      </div>
      <div className="mt-auto shrink-0 space-y-4 pt-10 pb-[max(16px,env(safe-area-inset-bottom))]">
        {footer}
      </div>
    </form>
  );
}

function ProjectOnboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from");
  const { isAuthenticated } = useConvexAuth();
  const convexUser = useQuery(
    api.users.getCurrentUser,
    isAuthenticated ? {} : "skip",
  );
  const createProject = useMutation(api.projects.create);

  const [hostname, setHostname] = useState("");
  const [step, setStep] = useState(STEP_TITLE);
  const [title, setTitle] = useState("");
  const [field, setField] = useState<HackathonField | "">("");
  const [blurb, setBlurb] = useState("");
  const [location, setLocation] = useState("");
  const [liveUrl, setLiveUrl] = useState("");
  const [lookingForContributors, setLookingForContributors] = useState(false);
  const [lookingToHire, setLookingToHire] = useState(false);
  const [inviteUserIds, setInviteUserIds] = useState<Id<"users">[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [created, setCreated] = useState(false);
  const [prefilledLocation, setPrefilledLocation] = useState(false);

  useEffect(() => {
    setHostname(window.location.hostname);
  }, []);

  useEffect(() => {
    if (prefilledLocation || !convexUser) return;
    if (convexUser.location?.trim()) {
      setLocation((current) => current || convexUser.location || "");
    }
    setPrefilledLocation(true);
  }, [convexUser, prefilledLocation]);

  const returnPath = getProjectOnboardingReturnPath(hostname, from);

  function exit() {
    router.replace(returnPath);
  }

  function goNext() {
    setSubmitError("");
    setStep((current) => Math.min(current + 1, LAST_STEP));
  }

  function goBack() {
    setSubmitError("");
    setStep((current) => Math.max(current - 1, STEP_TITLE));
  }

  function submitTitle(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;
    goNext();
  }

  function submitField(event: FormEvent) {
    event.preventDefault();
    if (!field) return;
    goNext();
  }

  function submitBlurb(event: FormEvent) {
    event.preventDefault();
    if (!blurb.trim()) return;
    goNext();
  }

  function submitLocation(event: FormEvent) {
    event.preventDefault();
    goNext();
  }

  function submitLiveUrl(event: FormEvent) {
    event.preventDefault();
    goNext();
  }

  function submitSeeking(event: FormEvent) {
    event.preventDefault();
    goNext();
  }

  async function finish(event: FormEvent) {
    event.preventDefault();
    await createAndFinish();
  }

  async function createAndFinish() {
    if (!isAuthenticated || submitting || !field) return;
    const trimmedTitle = title.trim();
    const trimmedBlurb = blurb.trim();
    if (!trimmedTitle || !trimmedBlurb) {
      setSubmitError("Finish the earlier questions before creating your project.");
      return;
    }

    setSubmitting(true);
    setSubmitError("");
    try {
      await createProject({
        field,
        title: trimmedTitle,
        blurb: trimmedBlurb,
        location: location.trim() || undefined,
        liveUrl: liveUrl.trim() || undefined,
        lookingForContributors,
        lookingToHire,
        inviteUserIds,
      });
      setCreated(true);
    } catch (err: unknown) {
      setSubmitError(
        err instanceof Error ? err.message : "Failed to create project.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (created) {
    return (
      <div className="flex min-h-dvh flex-col bg-white">
        <div className="mx-auto flex w-full max-w-lg flex-1 flex-col px-5 pt-[max(24px,env(safe-area-inset-top))] pb-[max(24px,env(safe-area-inset-bottom))]">
          <p
            className={`${jetbrainsMono.className} mt-8 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#00a6f3]`}
          >
            You&apos;re building.
          </p>
          <h1
            className={`${newsreader.className} mt-3 text-[36px] font-normal leading-[1.1] tracking-[-0.02em] text-neutral-900`}
          >
            {title.trim()} is live on your profile.
          </h1>
          <p
            className={`${jetbrainsMono.className} mt-4 text-[14px] leading-relaxed text-neutral-600`}
          >
            You can edit details, invite builders, and share your join code anytime.
          </p>
          <div className="mt-auto space-y-3 pt-10">
            <button
              type="button"
              onClick={() => router.replace(returnPath)}
              className={`${onboardButtonClass} flex h-12 w-full items-center justify-center rounded-xl px-6 text-white`}
              style={{ backgroundColor: HOPAMINE_BLUE }}
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-white">
      <ProgressHeader step={step} onBack={goBack} onExit={exit} />
      <div className="mx-auto flex w-full max-w-lg min-h-0 flex-1 flex-col px-5">
        {submitError ? (
          <div className="mt-4">
            <ZimaAuthError message={submitError} />
          </div>
        ) : null}

        {step === STEP_TITLE ? (
          <StepForm
            title="What's the project called?"
            onSubmit={submitTitle}
            centerContent
            footer={
              <div className="space-y-3">
                <ContinueButton disabled={!title.trim()} label="Continue" />
                <button
                  type="button"
                  onClick={exit}
                  className={`${onboardButtonClass} flex h-12 w-full items-center justify-center rounded-xl border border-neutral-200 bg-white px-6 text-neutral-900 transition-colors hover:bg-neutral-50`}
                >
                  Skip for now
                </button>
              </div>
            }
          >
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className={inputClass}
              placeholder="Project name"
              maxLength={120}
              autoFocus
              required
            />
          </StepForm>
        ) : null}

        {step === STEP_FIELD ? (
          <StepForm
            title="What field is it in?"
            onSubmit={submitField}
            footer={<ContinueButton disabled={!field} label="Continue" />}
          >
            <div className="flex flex-wrap gap-2">
              {fieldOptions.map((option) => {
                const selected = field === option;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setField(option)}
                    className={`${jetbrainsMono.className} rounded-full border px-4 py-2.5 text-[13px] font-semibold transition-colors ${
                      selected
                        ? "border-[#00a6f3] bg-[#00a6f3] text-white"
                        : "border-neutral-200 bg-white text-neutral-800 hover:border-neutral-300 hover:bg-neutral-50"
                    }`}
                  >
                    {HACKATHON_FIELDS[option]}
                  </button>
                );
              })}
            </div>
          </StepForm>
        ) : null}

        {step === STEP_BLURB ? (
          <StepForm
            title="What's the short pitch?"
            onSubmit={submitBlurb}
            footer={
              <ContinueButton disabled={!blurb.trim()} label="Continue" />
            }
          >
            <textarea
              value={blurb}
              onChange={(event) => setBlurb(event.target.value)}
              className={textareaClass}
              placeholder="What are you building?"
              maxLength={500}
              rows={5}
              required
            />
          </StepForm>
        ) : null}

        {step === STEP_LOCATION ? (
          <StepForm
            title="Where are you building it?"
            onSubmit={submitLocation}
            footer={
              <OptionalStepFooter
                canContinue
                onSkip={goNext}
              />
            }
          >
            <OptionalStepHint />
            <input
              type="text"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              className={inputClass}
              placeholder="City"
              maxLength={80}
            />
          </StepForm>
        ) : null}

        {step === STEP_LIVE_URL ? (
          <StepForm
            title="Got a live link?"
            onSubmit={submitLiveUrl}
            footer={
              <OptionalStepFooter canContinue onSkip={goNext} />
            }
          >
            <OptionalStepHint />
            <input
              type="url"
              value={liveUrl}
              onChange={(event) => setLiveUrl(event.target.value)}
              className={inputClass}
              placeholder="https://yourproject.com"
            />
          </StepForm>
        ) : null}

        {step === STEP_SEEKING ? (
          <StepForm
            title="Are you looking for people?"
            onSubmit={submitSeeking}
            footer={
              <OptionalStepFooter
                canContinue
                onSkip={() => {
                  setLookingForContributors(false);
                  setLookingToHire(false);
                  goNext();
                }}
              />
            }
          >
            <OptionalStepHint />
            <p
              className={`${jetbrainsMono.className} text-[13px] leading-relaxed text-neutral-600`}
            >
              Select any that apply — you can change this later.
            </p>
            <ProjectSeekingPicker
              variant="onboard"
              lookingForContributors={lookingForContributors}
              lookingToHire={lookingToHire}
              onLookingForContributorsChange={setLookingForContributors}
              onLookingToHireChange={setLookingToHire}
            />
          </StepForm>
        ) : null}

        {step === STEP_INVITES ? (
          <StepForm
            title="Invite builders?"
            onSubmit={(event) => void finish(event)}
            footer={
              <OptionalStepFooter
                canContinue={!submitting}
                onSkip={() => void createAndFinish()}
                continueLabel={submitting ? "Creating…" : "Create project"}
              />
            }
          >
            <OptionalStepHint />
            <ProjectMemberPicker
              selectedIds={inviteUserIds}
              onChange={setInviteUserIds}
              variant="light"
            />
          </StepForm>
        ) : null}
      </div>
    </div>
  );
}

export function ProjectOnboardClient() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center bg-white">
          <p className={`${jetbrainsMono.className} text-sm text-neutral-500`}>
            Loading…
          </p>
        </div>
      }
    >
      <ProjectOnboardContent />
    </Suspense>
  );
}
