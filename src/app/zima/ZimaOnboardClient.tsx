"use client";

import { useUser } from "@clerk/nextjs";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { api } from "../../../convex/_generated/api";
import {
  allowZimaOnboardPreviewInDev,
  hasCompletedZimaOnboarding,
} from "@/lib/zima/onboarding";
import { getZimaAuthHref, getZimaPath } from "@/lib/zima/routes";
import { suggestNycNeighborhoods } from "@/lib/zima/nycNeighborhoods";
import { jetbrainsMono, newsreader } from "../../../fonts";
import {
  ZimaAuthError,
  zimaRoundedInputClass as inputClass,
  zimaRoundedTextareaClass as textareaClass,
} from "./ZimaAuthUI";
import { ZIMA_ONBOARD_ARCHETYPES } from "../../../shared/zimaVocabulary";

const HOPAMINE_BLUE = "#00a6f3";
const NYC_CITY = "New York City";
const STEP_NAME = 0;
const STEP_CITY = 1;
const STEP_NEIGHBORHOOD = 2;
const STEP_ARCHETYPE = 3;
const STEP_WORKING_ON = 4;
const STEP_BIO = 5;
const STEP_CONTACT = 6;
const ONBOARD_LAST_STEP = STEP_CONTACT;

const onboardButtonClass = `${jetbrainsMono.className} text-[15px] font-semibold uppercase tracking-wide`;

const OTHER_ARCHETYPE = "Other";

const ARCHETYPES = [...ZIMA_ONBOARD_ARCHETYPES, OTHER_ARCHETYPE] as const;

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

function OnboardProgressHeader({
  step,
  cityChoice,
  onBack,
  onExit,
}: {
  step: number;
  cityChoice: "nyc" | "other" | null;
  onBack: () => void;
  onExit: () => void;
}) {
  const totalSteps = cityChoice === "nyc" ? 7 : 6;
  const displayStep = cityChoice !== "nyc" && step > STEP_NEIGHBORHOOD
    ? step - 1
    : step;
  const progressPercent = ((displayStep + 1) / totalSteps) * 100;

  return (
    <header className="relative z-40 shrink-0 border-b border-neutral-200/80 bg-white">
      <div
        className="mx-auto flex w-full max-w-lg items-center gap-3 py-4 pl-[max(0px,env(safe-area-inset-left))] pr-[max(16px,env(safe-area-inset-right))] pt-[max(16px,env(safe-area-inset-top))]"
      >
        <button
          type="button"
          onClick={step === STEP_NAME ? onExit : onBack}
          aria-label={step === STEP_NAME ? "Leave onboarding" : "Go back"}
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

function OnboardStepForm({
  title,
  onSubmit,
  children,
  footer,
  centerContent = false,
  centerTitle = false,
}: {
  title: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  children: ReactNode;
  footer: ReactNode;
  /** Centers fields under the title (e.g. single name input). */
  centerContent?: boolean;
  centerTitle?: boolean;
}) {
  return (
    <form
      onSubmit={onSubmit}
      className="flex min-h-0 flex-1 flex-col"
    >
      <h1
        className={`mt-4 shrink-0 text-balance ${newsreader.className} text-[32px] font-normal leading-[1.12] tracking-[-0.02em] text-[#00a6f3] ${
          centerContent || centerTitle ? "text-center" : ""
        }`}
      >
        {title}
      </h1>
      <div
        className={`mt-5 flex shrink-0 flex-col gap-5 ${
          centerContent
            ? "mx-auto w-full max-w-sm text-center [&_input]:text-center [&_label]:text-center"
            : ""
        }`}
      >
        {children}
      </div>
      <div className="min-h-0 flex-1" aria-hidden />
      <div className="mt-auto shrink-0 space-y-4 pt-10 pb-[max(16px,env(safe-area-inset-bottom))]">
        {footer}
      </div>
    </form>
  );
}

export function ZimaOnboardClient() {
  const { isLoaded, isSignedIn, user } = useUser();
  const { isAuthenticated } = useConvexAuth();
  const convexUser = useQuery(
    api.users.getCurrentUser,
    isAuthenticated ? {} : "skip",
  );
  const completeZimaOnboarding = useMutation(api.users.completeZimaOnboarding);
  const router = useRouter();

  const [searchHref, setSearchHref] = useState("/zima/search");
  const [signInHref, setSignInHref] = useState(
    "/zima/sign-in?redirect_url=%2Fzima%2Fonboard",
  );
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [location, setLocation] = useState(NYC_CITY);
  const [cityChoice, setCityChoice] = useState<"nyc" | "other" | null>("nyc");
  const [neighborhood, setNeighborhood] = useState("");
  const [neighborhoodOpen, setNeighborhoodOpen] = useState(false);
  const [bio, setBio] = useState("");
  const [workingOn, setWorkingOn] = useState("");
  const [archetypes, setArchetypes] = useState<string[]>([]);
  const [otherArchetype, setOtherArchetype] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactEmailError, setContactEmailError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [prefilled, setPrefilled] = useState(false);

  useEffect(() => {
    const hostname = window.location.hostname;
    setSearchHref(getZimaPath("search", hostname));
    setSignInHref(
      getZimaAuthHref("sign-in", getZimaPath("onboard", hostname), hostname),
    );
  }, []);

  useEffect(() => {
    if (!hasCompletedZimaOnboarding(convexUser)) return;
    if (allowZimaOnboardPreviewInDev()) return;
    router.replace(searchHref);
  }, [convexUser, router, searchHref]);

  useEffect(() => {
    if (prefilled || !convexUser) return;
    setName((current) => current || convexUser.name || user?.fullName || "");
    setUsername((current) => current || convexUser.username || "");
    setBio((current) => current || convexUser.bio || "");
    setWorkingOn((current) => current || convexUser.nowPlaying || "");
    setContactEmail(
      (current) =>
        current ||
        convexUser.contactEmail ||
        convexUser.email ||
        user?.primaryEmailAddress?.emailAddress ||
        "",
    );
    setPrefilled(true);
  }, [convexUser, prefilled, user?.fullName, user?.primaryEmailAddress?.emailAddress]);

  const neighborhoodSuggestions = useMemo(
    () => suggestNycNeighborhoods(neighborhood),
    [neighborhood],
  );

  function goNext() {
    setSubmitError("");
    setStep((current) => {
      if (current === STEP_CITY && cityChoice !== "nyc") {
        return STEP_ARCHETYPE;
      }
      return Math.min(current + 1, ONBOARD_LAST_STEP);
    });
  }

  function goBack() {
    setSubmitError("");
    setStep((current) => {
      if (current === STEP_ARCHETYPE && cityChoice !== "nyc") {
        return STEP_CITY;
      }
      return Math.max(current - 1, STEP_NAME);
    });
  }

  function submitIdentity(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    goNext();
  }

  function submitPlace(event: FormEvent) {
    event.preventDefault();
    if (cityChoice === "nyc") {
      goNext();
      return;
    }
    if (cityChoice === "other" && location.trim()) {
      setNeighborhood("");
      goNext();
    }
  }

  function submitNeighborhood(event: FormEvent) {
    event.preventDefault();
    if (!neighborhood.trim()) return;
    goNext();
  }

  function selectedArchetypesForSave() {
    return [
      ...archetypes.filter((item) => item !== OTHER_ARCHETYPE),
      ...(archetypes.includes(OTHER_ARCHETYPE) && otherArchetype.trim()
        ? [otherArchetype.trim()]
        : []),
    ];
  }

  function submitBuilder(event: FormEvent) {
    event.preventDefault();
    if (selectedArchetypesForSave().length === 0) return;
    goNext();
  }

  function submitBio(event: FormEvent) {
    event.preventDefault();
    if (!bio.trim()) return;
    goNext();
  }

  function submitWorkingOn(event: FormEvent) {
    event.preventDefault();
    if (!workingOn.trim()) return;
    goNext();
  }

  async function finishOnboarding(event: FormEvent) {
    event.preventDefault();
    const trimmedEmail = contactEmail.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setContactEmailError("Enter a valid email address");
      return;
    }
    setContactEmailError("");
    if (!isAuthenticated || submitting) return;

    setSubmitting(true);
    setSubmitError("");
    try {
      await completeZimaOnboarding({
        name: name.trim(),
        username: username.trim() || undefined,
        location:
          cityChoice === "nyc" && neighborhood.trim()
            ? `${neighborhood.trim()}, ${NYC_CITY}`
            : location.trim(),
        bio: bio.trim() || undefined,
        nowPlaying: workingOn.trim() || undefined,
        skills: selectedArchetypesForSave(),
        contactEmail: trimmedEmail,
      });
      router.replace(searchHref);
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Could not save your profile. Try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (!isLoaded || !isSignedIn) {
    return (
      <div className="relative flex min-h-dvh items-center justify-center bg-white px-6">
        <div className="flex w-full max-w-sm flex-col items-center gap-4 text-center">
          <h1
            className={`${newsreader.className} text-[32px] font-normal leading-tight tracking-[-0.02em] text-[#00a6f3]`}
          >
            Create your Zima profile
          </h1>
          <p className={`${jetbrainsMono.className} text-[13px] text-neutral-600`}>
            Sign in to finish onboarding and start meeting builders nearby.
          </p>
          <a
            href={signInHref}
            className={`${onboardButtonClass} inline-flex h-12 items-center justify-center rounded-xl px-6 text-white`}
            style={{ backgroundColor: HOPAMINE_BLUE }}
          >
            Continue to sign in
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-dvh flex-col bg-white">
      <OnboardProgressHeader
        step={step}
        cityChoice={cityChoice}
        onBack={goBack}
        onExit={() => router.replace(searchHref)}
      />

      <main
        className="relative z-10 mx-auto flex min-h-0 w-full max-w-lg flex-1 flex-col px-[max(16px,env(safe-area-inset-left))] pr-[max(16px,env(safe-area-inset-right))] pt-4"
      >
        <div className="flex min-h-0 flex-1 flex-col">
        {step === STEP_NAME ? (
          <OnboardStepForm
            title="What is your name?"
            onSubmit={submitIdentity}
            centerContent
            footer={<ContinueButton disabled={!name.trim()} label="Continue" />}
          >
            <input
              id="zima-onboard-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Your name"
              required
              autoComplete="name"
              aria-label="Your name"
              className={inputClass}
            />
          </OnboardStepForm>
        ) : null}

        {step === STEP_CITY ? (
          <OnboardStepForm
            title="What city do you live in?"
            onSubmit={submitPlace}
            footer={
              <ContinueButton
                disabled={
                  cityChoice === "nyc"
                    ? false
                    : cityChoice !== "other" || !location.trim()
                }
                label="Continue"
              />
            }
          >
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => {
                  setCityChoice("nyc");
                  setLocation(NYC_CITY);
                }}
                className={`${onboardButtonClass} flex h-12 w-full items-center justify-center rounded-xl px-6 transition-colors ${
                  cityChoice === "nyc"
                    ? "border border-transparent bg-[#00a6f3] text-white"
                    : "border border-neutral-200 bg-white text-neutral-900"
                }`}
              >
                New York City
              </button>
              <button
                type="button"
                onClick={() => {
                  setCityChoice("other");
                  setNeighborhood("");
                  setLocation((current) =>
                    current === NYC_CITY ? "" : current,
                  );
                }}
                className={`${onboardButtonClass} flex h-12 w-full items-center justify-center rounded-xl px-6 transition-colors ${
                  cityChoice === "other"
                    ? "border border-transparent bg-[#00a6f3] text-white"
                    : "border border-neutral-200 bg-white text-neutral-900"
                }`}
              >
                Other
              </button>
              {cityChoice === "other" ? (
                <input
                  id="zima-onboard-location"
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                  placeholder="Your city"
                  required
                  autoComplete="address-level2"
                  aria-label="Your city"
                  className={inputClass}
                />
              ) : null}
            </div>
          </OnboardStepForm>
        ) : null}

        {step === STEP_NEIGHBORHOOD ? (
          <OnboardStepForm
            title="What neighborhood are you from in NYC?"
            onSubmit={submitNeighborhood}
            footer={
              <ContinueButton
                disabled={!neighborhood.trim()}
                label="Continue"
              />
            }
          >
            <div className="relative">
              <input
                id="zima-onboard-neighborhood"
                value={neighborhood}
                onChange={(event) => {
                  setNeighborhood(event.target.value);
                  setNeighborhoodOpen(true);
                }}
                onFocus={() => setNeighborhoodOpen(true)}
                onBlur={() => {
                  window.setTimeout(() => setNeighborhoodOpen(false), 120);
                }}
                placeholder="Start typing a neighborhood"
                required
                autoComplete="off"
                role="combobox"
                aria-expanded={neighborhoodOpen}
                aria-controls="zima-onboard-neighborhood-list"
                aria-autocomplete="list"
                aria-label="Neighborhood in New York City"
                className={inputClass}
              />
              {neighborhoodOpen && neighborhoodSuggestions.length > 0 ? (
                <ul
                  id="zima-onboard-neighborhood-list"
                  role="listbox"
                  className="absolute z-20 mt-2 max-h-64 w-full overflow-auto rounded-xl border border-neutral-200 bg-white py-1 shadow-sm"
                >
                  {neighborhoodSuggestions.map((option) => (
                    <li key={option} role="option" aria-selected={neighborhood === option}>
                      <button
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => {
                          setNeighborhood(option);
                          setNeighborhoodOpen(false);
                        }}
                        className={`${jetbrainsMono.className} w-full px-5 py-2.5 text-left text-[14px] text-neutral-800 hover:bg-neutral-100 ${
                          neighborhood === option ? "bg-neutral-100" : ""
                        }`}
                      >
                        {option}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </OnboardStepForm>
        ) : null}

        {step === STEP_ARCHETYPE ? (
          <OnboardStepForm
            title="What is your archetype(s)?"
            onSubmit={submitBuilder}
            centerTitle
            footer={
              <ContinueButton
                disabled={selectedArchetypesForSave().length === 0}
                label="Continue"
              />
            }
          >
            <div className="grid grid-cols-2 gap-3">
              {ARCHETYPES.map((option) => {
                const selected = archetypes.includes(option);
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() =>
                      setArchetypes((current) =>
                        current.includes(option)
                          ? current.filter((item) => item !== option)
                          : [...current, option],
                      )
                    }
                    className={`${onboardButtonClass} flex min-h-12 items-center justify-center rounded-xl px-3 py-3 text-center text-[13px] leading-tight transition-colors ${
                      option === OTHER_ARCHETYPE ? "col-span-2" : ""
                    } ${
                      selected
                        ? "border border-transparent bg-[#00a6f3] text-white"
                        : "border border-neutral-200 bg-white text-neutral-900"
                    }`}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
            {archetypes.includes(OTHER_ARCHETYPE) ? (
              <input
                id="zima-onboard-archetype-other"
                value={otherArchetype}
                onChange={(event) => setOtherArchetype(event.target.value)}
                placeholder="Your archetype"
                aria-label="Your archetype"
                className={inputClass}
              />
            ) : null}
          </OnboardStepForm>
        ) : null}

        {step === STEP_WORKING_ON ? (
          <OnboardStepForm
            title="What are you working on?"
            onSubmit={submitWorkingOn}
            footer={
              <ContinueButton disabled={!workingOn.trim()} label="Continue" />
            }
          >
            <textarea
              id="zima-onboard-working-on"
              value={workingOn}
              onChange={(event) => setWorkingOn(event.target.value)}
              placeholder="Your current project, startup, or initiative."
              rows={6}
              required
              aria-label="What you are working on"
              className={`${textareaClass} min-h-[160px]`}
            />
          </OnboardStepForm>
        ) : null}

        {step === STEP_BIO ? (
          <OnboardStepForm
            title="Tell me about yourself?"
            onSubmit={submitBio}
            footer={
              <ContinueButton disabled={!bio.trim()} label="Continue" />
            }
          >
            <textarea
              id="zima-onboard-bio"
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              placeholder="A short intro about you, what you're making, and who you want to meet."
              rows={10}
              required
              aria-label="Bio"
              className={`${textareaClass} min-h-[220px]`}
            />
          </OnboardStepForm>
        ) : null}

        {step === STEP_CONTACT ? (
          <OnboardStepForm
            title="What is the best email to reach you?"
            onSubmit={(event) => void finishOnboarding(event)}
            footer={
              <ContinueButton
                disabled={submitting || !isAuthenticated || !contactEmail.trim()}
                label={submitting ? "Saving…" : "Enter Zima"}
              />
            }
          >
            <div className="space-y-2">
              <input
                id="zima-onboard-contact-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                value={contactEmail}
                onChange={(event) => {
                  setContactEmail(event.target.value);
                  setContactEmailError("");
                }}
                placeholder="you@email.com"
                required
                aria-label="Best email to reach you"
                className={inputClass}
              />
              {contactEmailError ? (
                <ZimaAuthError message={contactEmailError} />
              ) : null}
            </div>
            {submitError ? <ZimaAuthError message={submitError} /> : null}
          </OnboardStepForm>
        ) : null}
        </div>
      </main>
    </div>
  );
}
