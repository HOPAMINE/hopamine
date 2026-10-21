"use client";

import { useUser } from "@clerk/nextjs";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import {
  useEffect,
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
import { jetbrainsMono, newsreader } from "../../../fonts";
import {
  ZimaAuthError,
  zimaRoundedInputClass as inputClass,
  zimaRoundedTextareaClass as textareaClass,
} from "./ZimaAuthUI";
import { normalizeOptionalProjectUrl } from "../../../convex/lib/projectUrls";
import {
  ZIMA_CONTRIBUTE_INTENT,
  ZIMA_INTENTS,
  ZIMA_ONBOARD_ARCHETYPES,
  canonicalZimaIntent,
} from "../../../shared/zimaVocabulary";

const HOPAMINE_BLUE = "#00a6f3";
const STEP_NAME = 0;
const STEP_CITY = 1;
const STEP_POSTAL = 2;
const STEP_ARCHETYPE = 3;
const STEP_WORKING_ON = 4;
const STEP_INTENT = 5;
const STEP_HELP_WITH = 6;
const STEP_LINKS = 7;
const STEP_RECENT_PROJECT = 8;
const STEP_DISCORD = 9;
const STEP_BIO = 10;
const STEP_CONTACT = 11;
const ONBOARD_LAST_STEP = STEP_CONTACT;
const ONBOARD_STEP_COUNT = ONBOARD_LAST_STEP + 1;
/** Postal code stays in the flow, but we are not asking for it yet. */
const ASK_POSTAL_CODE = false;
const ZIMA_DISCORD_INVITE = "https://discord.gg/4pH2UnxPBm";

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

function isPostalCode(value: string) {
  const trimmed = value.trim().replace(/\s+/g, " ");
  return (
    /^[A-Za-z0-9](?:[A-Za-z0-9]|[ -](?=[A-Za-z0-9])){1,10}$/.test(trimmed) &&
    /\d/.test(trimmed)
  );
}

function OnboardProgressHeader({
  step,
  includeHelpStep,
  onBack,
  onExit,
}: {
  step: number;
  includeHelpStep: boolean;
  onBack: () => void;
  onExit: () => void;
}) {
  let totalSteps = ONBOARD_STEP_COUNT;
  if (!includeHelpStep) totalSteps -= 1;
  if (!ASK_POSTAL_CODE) totalSteps -= 1;
  let displayStep = step;
  if (!ASK_POSTAL_CODE && step > STEP_POSTAL) displayStep -= 1;
  if (!includeHelpStep && step > STEP_HELP_WITH) displayStep -= 1;
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
        className={`mt-5 flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto ${
          centerContent
            ? "mx-auto w-full max-w-sm text-center [&_input]:text-center [&_label]:text-center"
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
  const [location, setLocation] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [bio, setBio] = useState("");
  const [workingOn, setWorkingOn] = useState("");
  const [zimaIntent, setZimaIntent] = useState("");
  const [zimaHelpWith, setZimaHelpWith] = useState("");
  const [links, setLinks] = useState<string[]>([""]);
  const [linksError, setLinksError] = useState("");
  const [recentProject, setRecentProject] = useState("");
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
    setZimaIntent((current) => {
      if (current) return current;
      return convexUser.zimaIntent && canonicalZimaIntent(convexUser.zimaIntent)
        ? convexUser.zimaIntent
        : "";
    });
    setZimaHelpWith((current) => current || convexUser.zimaHelpWith || "");
    setLinks((current) => {
      if (current.some((link) => link.trim())) return current;
      return convexUser.links && convexUser.links.length > 0
        ? convexUser.links
        : [""];
    });
    setRecentProject((current) => current || convexUser.recentProject || "");
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

  function goNext() {
    setSubmitError("");
    setStep((current) => {
      if (!ASK_POSTAL_CODE && current === STEP_CITY) {
        return STEP_ARCHETYPE;
      }
      if (current === STEP_INTENT && zimaIntent !== ZIMA_CONTRIBUTE_INTENT) {
        return STEP_LINKS;
      }
      return Math.min(current + 1, ONBOARD_LAST_STEP);
    });
  }

  function goBack() {
    setSubmitError("");
    setStep((current) => {
      if (!ASK_POSTAL_CODE && current === STEP_ARCHETYPE) {
        return STEP_CITY;
      }
      if (current === STEP_LINKS && zimaIntent !== ZIMA_CONTRIBUTE_INTENT) {
        return STEP_INTENT;
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
    if (!location.trim()) return;
    goNext();
  }

  function submitPostal(event: FormEvent) {
    event.preventDefault();
    if (!isPostalCode(postalCode)) return;
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

  function submitIntent(event: FormEvent) {
    event.preventDefault();
    if (!canonicalZimaIntent(zimaIntent)) return;
    if (zimaIntent !== ZIMA_CONTRIBUTE_INTENT) setZimaHelpWith("");
    goNext();
  }

  function submitHelpWith(event: FormEvent) {
    event.preventDefault();
    if (zimaIntent !== ZIMA_CONTRIBUTE_INTENT || !zimaHelpWith.trim()) return;
    goNext();
  }

  function savedLinks() {
    const normalized: string[] = [];
    for (const link of links) {
      const trimmed = link.trim();
      if (!trimmed) continue;
      const url = normalizeOptionalProjectUrl(trimmed);
      if (!url || normalized.includes(url)) continue;
      normalized.push(url);
    }
    return normalized;
  }

  function submitLinks(event: FormEvent) {
    event.preventDefault();
    try {
      savedLinks();
      setLinksError("");
      goNext();
    } catch (error) {
      setLinksError(
        error instanceof Error ? error.message : "Enter a valid link",
      );
    }
  }

  function submitRecentProject(event: FormEvent) {
    event.preventDefault();
    if (!recentProject.trim()) return;
    goNext();
  }

  function submitDiscord(event: FormEvent) {
    event.preventDefault();
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
    if (
      !location.trim() ||
      (ASK_POSTAL_CODE && !isPostalCode(postalCode)) ||
      !canonicalZimaIntent(zimaIntent) ||
      !recentProject.trim() ||
      (zimaIntent === ZIMA_CONTRIBUTE_INTENT && !zimaHelpWith.trim())
    ) {
      setSubmitError("Finish the earlier questions before entering Zima.");
      return;
    }
    if (!isAuthenticated || submitting) return;

    let profileLinks: string[];
    try {
      profileLinks = savedLinks();
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Enter a valid link",
      );
      return;
    }

    setSubmitting(true);
    setSubmitError("");
    try {
      await completeZimaOnboarding({
        name: name.trim(),
        username: username.trim() || undefined,
        location: ASK_POSTAL_CODE
          ? `${location.trim()}, ${postalCode.trim().replace(/\s+/g, " ")}`
          : location.trim(),
        bio: bio.trim() || undefined,
        nowPlaying: workingOn.trim() || undefined,
        zimaIntent,
        zimaHelpWith:
          zimaIntent === ZIMA_CONTRIBUTE_INTENT
            ? zimaHelpWith.trim()
            : undefined,
        links: profileLinks,
        recentProject: recentProject.trim(),
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
        includeHelpStep={zimaIntent === ZIMA_CONTRIBUTE_INTENT}
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
            centerContent
            footer={
              <ContinueButton disabled={!location.trim()} label="Continue" />
            }
          >
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
          </OnboardStepForm>
        ) : null}

        {ASK_POSTAL_CODE && step === STEP_POSTAL ? (
          <OnboardStepForm
            title="What is your postal code?"
            onSubmit={submitPostal}
            centerContent
            footer={
              <ContinueButton
                disabled={!isPostalCode(postalCode)}
                label="Continue"
              />
            }
          >
            <input
              id="zima-onboard-postal"
              value={postalCode}
              onChange={(event) => setPostalCode(event.target.value)}
              placeholder="10001"
              required
              autoComplete="postal-code"
              autoCapitalize="characters"
              aria-label="Postal code"
              className={inputClass}
            />
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

        {step === STEP_INTENT ? (
          <OnboardStepForm
            title="What brings you to Zima?"
            onSubmit={submitIntent}
            footer={
              <ContinueButton
                disabled={!canonicalZimaIntent(zimaIntent)}
                label="Continue"
              />
            }
          >
            <div className="flex flex-col gap-3">
              {ZIMA_INTENTS.map((option) => {
                const selected = zimaIntent === option;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setZimaIntent(option)}
                    className={`${onboardButtonClass} flex min-h-12 w-full items-center justify-center rounded-xl px-4 py-3 text-center text-[13px] leading-tight transition-colors ${
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
          </OnboardStepForm>
        ) : null}

        {step === STEP_HELP_WITH && zimaIntent === ZIMA_CONTRIBUTE_INTENT ? (
          <OnboardStepForm
            title="What kind of work would you like to help with?"
            onSubmit={submitHelpWith}
            footer={
              <ContinueButton
                disabled={!zimaHelpWith.trim()}
                label="Continue"
              />
            }
          >
            <textarea
              id="zima-onboard-help-with"
              value={zimaHelpWith}
              onChange={(event) => setZimaHelpWith(event.target.value)}
              placeholder="I can help with website design, hardware design, gardening projects, software feedback"
              rows={6}
              required
              aria-label="What kind of work you would like to help with"
              className={`${textareaClass} min-h-[160px]`}
            />
          </OnboardStepForm>
        ) : null}

        {step === STEP_LINKS ? (
          <OnboardStepForm
            title="Links"
            onSubmit={submitLinks}
            footer={<ContinueButton disabled={false} label="Continue" />}
          >
            <div className="flex flex-col gap-3">
              {links.map((link, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    id={index === 0 ? "zima-onboard-link" : undefined}
                    value={link}
                    onChange={(event) => {
                      const value = event.target.value;
                      setLinks((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index ? value : item,
                        ),
                      );
                      setLinksError("");
                    }}
                    placeholder="GitHub, website, or portfolio"
                    inputMode="url"
                    autoComplete="url"
                    aria-label={`Link ${index + 1}`}
                    className={inputClass}
                  />
                  {links.length > 1 ? (
                    <button
                      type="button"
                      onClick={() =>
                        setLinks((current) =>
                          current.filter((_, itemIndex) => itemIndex !== index),
                        )
                      }
                      aria-label={`Remove link ${index + 1}`}
                      className={`${onboardButtonClass} inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-neutral-200 bg-white text-neutral-900`}
                    >
                      ×
                    </button>
                  ) : null}
                </div>
              ))}
              {links.length < 8 ? (
                <button
                  type="button"
                  onClick={() => setLinks((current) => [...current, ""])}
                  className={`${onboardButtonClass} flex h-12 w-full items-center justify-center rounded-xl border border-neutral-200 bg-white px-6 text-neutral-900`}
                >
                  Add another
                </button>
              ) : null}
              {linksError ? <ZimaAuthError message={linksError} /> : null}
            </div>
          </OnboardStepForm>
        ) : null}

        {step === STEP_RECENT_PROJECT ? (
          <OnboardStepForm
            title="What's a project you've worked on recently?"
            onSubmit={submitRecentProject}
            footer={
              <ContinueButton
                disabled={!recentProject.trim()}
                label="Continue"
              />
            }
          >
            <textarea
              id="zima-onboard-recent-project"
              value={recentProject}
              onChange={(event) => setRecentProject(event.target.value)}
              placeholder="Something you shipped, built, or helped with."
              rows={6}
              required
              aria-label="A project you've worked on recently"
              className={`${textareaClass} min-h-[160px]`}
            />
          </OnboardStepForm>
        ) : null}

        {step === STEP_DISCORD ? (
          <OnboardStepForm
            title="Join the Discord"
            onSubmit={submitDiscord}
            footer={<ContinueButton disabled={false} label="Continue" />}
          >
            <a
              href={ZIMA_DISCORD_INVITE}
              target="_blank"
              rel="noopener noreferrer"
              className={`${onboardButtonClass} flex h-12 w-full items-center justify-center rounded-xl px-6 text-white`}
              style={{ backgroundColor: HOPAMINE_BLUE }}
            >
              Join the Discord
            </a>
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
