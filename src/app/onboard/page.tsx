"use client"

import { useState, useRef, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { useMutation, useConvexAuth, useQuery } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { CLAIM_PARTICIPATION_PATH } from "@/lib/claimRoutes"
import { MoviePicker } from "@/components/onboard/MoviePicker"
import { MusicPicker } from "@/components/onboard/MusicPicker"
import { type MusicTrack } from "@/lib/music-tracks"
import { type TmdbMovie } from "@/lib/tmdb"
import Lottie from "lottie-react"
import globeAnimation from "../../../public/globe.json"
import { robotoFlex } from "../../../fonts"

// ─── Constants ────────────────────────────────────────────────────────────────

const questionClass = `${robotoFlex.className} text-2xl text-neutral-900`
const questionAnswerClass = `${robotoFlex.className} text-3xl text-neutral-900 leading-snug`
const questionInputClass = `w-full bg-transparent ${robotoFlex.className} text-2xl text-neutral-700 placeholder:text-neutral-300 focus:outline-none leading-relaxed border-b border-neutral-200 focus:border-accent-navbar transition-colors pb-1`
const questionInputLineClass = `${questionInputClass} pb-2 mb-4`
const questionInputSmClass = `flex-1 bg-transparent ${robotoFlex.className} text-xl text-neutral-700 placeholder:text-neutral-300 focus:outline-none border-b border-neutral-200 focus:border-accent-navbar transition-colors pb-1`

// ─── Sub-components ───────────────────────────────────────────────────────────

function AutoTextarea({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  placeholder: string
}) {
  const ref = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = "auto"
      ref.current.style.height = ref.current.scrollHeight + "px"
    }
  }, [value])
  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={3}
      className={`${questionInputClass} pb-2 mb-4`}
    />
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OnboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center bg-[linear-gradient(to_bottom_right,#00a6f3_0%,#00a6f3_35%,#cdeefc_62%,#f5fafc_82%,#fefefe_100%)]">
          <p className="font-mono text-sm text-neutral-500">Loading…</p>
        </div>
      }
    >
      <OnboardPageContent />
    </Suspense>
  )
}

function OnboardPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const fromClaim = searchParams.get("from") === "claim"
  const completeOnboarding = useMutation(api.users.completeOnboarding)
  const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth()
  const convexUser = useQuery(api.users.getCurrentUser, isAuthenticated ? {} : "skip")

  // Submission state
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState("")

  // Question answers
  const [name, setName] = useState("")
  const [nameDone, setNameDone] = useState(false)

  const [username, setUsername] = useState("")
  const [usernameError, setUsernameError] = useState("")
  const [usernameDone, setUsernameDone] = useState(false)

  const [location, setLocation] = useState("")
  const [locationDone, setLocationDone] = useState(false)

  const [bioDraft, setBioDraft] = useState("")
  const [bio, setBio] = useState("")
  const [bioDone, setBioDone] = useState(false)
  const [editingBio, setEditingBio] = useState(false)
  const [tempBio, setTempBio] = useState("")

  const [skillsList, setSkillsList] = useState<string[]>(["", ""])
  const [skillsDone, setSkillsDone] = useState(false)
  const [editingSkills, setEditingSkills] = useState(false)
  const [tempSkillsList, setTempSkillsList] = useState<string[]>(["", ""])

  const [visionDraft, setVisionDraft] = useState("")
  const [vision, setVision] = useState("")
  const [visionDone, setVisionDone] = useState(false)
  const [editingVision, setEditingVision] = useState(false)
  const [tempVision, setTempVision] = useState("")

  const [whyDraft, setWhyDraft] = useState("")
  const [why, setWhy] = useState("")
  const [done, setDone] = useState(false)

  const [learningDraft, setLearningDraft] = useState("")
  const [learning, setLearning] = useState("")
  const [learningDone, setLearningDone] = useState(false)
  const [editingLearning, setEditingLearning] = useState(false)
  const [tempLearning, setTempLearning] = useState("")

  const [selectedMovies, setSelectedMovies] = useState<TmdbMovie[]>([])
  const [moviesDone, setMoviesDone] = useState(false)

  const [selectedMusic, setSelectedMusic] = useState<MusicTrack[]>([])
  const [musicDone, setMusicDone] = useState(false)

  const [discord, setDiscord] = useState("")
  const [discordError, setDiscordError] = useState("")
  const [discordDone, setDiscordDone] = useState(false)

  // Confirmation screen
  const [confirmed, setConfirmed] = useState(false)

  useEffect(() => {
    if (!fromClaim || convexUser === undefined || !convexUser?.onboardingCompletedAt) return
    router.replace(CLAIM_PARTICIPATION_PATH)
  }, [convexUser, fromClaim, router])

  const endRef = useRef<HTMLDivElement>(null)
  const topRef = useRef<HTMLDivElement>(null)

  function scrollDown() {
    setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 120)
  }

  // ── Question submit handlers ──────────────────────────────────────────────

  function submitName() {
    if (!name.trim()) return
    setNameDone(true)
    scrollDown()
  }

  function submitUsername() {
    const trimmed = username.trim().replace(/^@/, "").toLowerCase()
    if (trimmed && !/^[a-z0-9_]{3,30}$/.test(trimmed)) {
      setUsernameError("Use 3–30 lowercase letters, numbers, or underscores.")
      return
    }
    setUsernameError("")
    setUsername(trimmed)
    setUsernameDone(true)
    scrollDown()
  }

  function submitLocation() {
    if (!location.trim()) return
    setLocationDone(true)
    scrollDown()
  }

  function submitBio() {
    if (!bioDraft.trim()) return
    setBio(bioDraft.trim())
    setBioDone(true)
    scrollDown()
  }

  function saveBio() {
    if (!tempBio.trim()) return
    setBio(tempBio.trim())
    setEditingBio(false)
  }

  function submitSkills() {
    if (!skillsList.some((s) => s.trim())) return
    setSkillsDone(true)
    scrollDown()
  }

  function saveSkills() {
    if (!tempSkillsList.some((s) => s.trim())) return
    setSkillsList([...tempSkillsList])
    setEditingSkills(false)
  }

  function submitVision() {
    if (!visionDraft.trim()) return
    setVision(visionDraft.trim())
    setVisionDone(true)
    scrollDown()
  }

  function saveVision() {
    if (!tempVision.trim()) return
    setVision(tempVision.trim())
    setEditingVision(false)
  }

  // Q6 just locks the answer locally — no mutation yet
  function submitWhy() {
    if (!whyDraft.trim()) return
    setWhy(whyDraft.trim())
    setDone(true)
    scrollDown()
  }

  function submitLearning() {
    if (!learningDraft.trim()) return
    setLearning(learningDraft.trim())
    setLearningDone(true)
    scrollDown()
  }

  function saveLearning() {
    if (!tempLearning.trim()) return
    setLearning(tempLearning.trim())
    setEditingLearning(false)
  }

  function submitMovies() {
    if (selectedMovies.length === 0) return
    setMoviesDone(true)
    scrollDown()
  }

  function submitMusic() {
    if (selectedMusic.length === 0) return
    setMusicDone(true)
    scrollDown()
  }

  function submitDiscord() {
    const trimmed = discord.trim().replace(/^@/, "")
    if (trimmed && !/^[a-zA-Z0-9_.]{2,32}(#\d{4})?$/.test(trimmed)) {
      setDiscordError("Just your username — e.g. jonsmith or jonsmith#1234")
      return
    }
    setDiscordError("")
    setDiscord(trimmed)
    setDiscordDone(true)
    scrollDown()
  }

  // The actual Convex commit happens here
  async function finishOnboarding() {
    if (submitting || !isAuthenticated) return
    setSubmitting(true)
    setSubmitError("")
    try {
      await completeOnboarding({
        name: name.trim(),
        username: username.trim() || undefined,
        location: location.trim(),
        bio: bio.trim() || undefined,
        skills: skillsList.filter((s) => s.trim()),
        vision,
        why,
        learning,
        favoriteMovies:
          selectedMovies.length > 0
            ? selectedMovies.map((movie) => ({
                id: movie.id,
                title: movie.title,
                year: movie.year ?? undefined,
                posterUrl: movie.posterUrl ?? undefined,
                tmdbUrl: movie.tmdbUrl,
              }))
            : undefined,
        favoriteMusic:
          selectedMusic.length > 0
            ? selectedMusic.map((track) => ({
                id: track.id,
                title: track.title,
                artist: track.artist,
                album: track.album,
                artworkUrl: track.artworkUrl ?? undefined,
                previewUrl: track.previewUrl ?? undefined,
                geniusUrl: track.geniusUrl ?? undefined,
              }))
            : undefined,
        discord: discord.trim() || undefined,
      })
      if (fromClaim) {
        router.replace(CLAIM_PARTICIPATION_PATH)
        return
      }
      setConfirmed(true)
      setTimeout(() => topRef.current?.scrollTo({ top: 0, behavior: "smooth" }), 80)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong — please try again."
      setSubmitError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  // ── Derived display values ────────────────────────────────────────────────

  const displayVision = vision.length > 300 ? vision.slice(0, 300).trimEnd() + "…" : vision
  const displayBio = bio.length > 200 ? bio.slice(0, 200).trimEnd() + "…" : bio

  // ── Shared button class helpers ───────────────────────────────────────────

  const outlineBtn = (active: boolean) =>
    `font-mono text-sm uppercase tracking-wide px-6 py-2.5 border-2 transition-colors cursor-pointer ${
      active
        ? "border-accent-navbar text-accent-navbar hover:bg-accent-navbar hover:text-white"
        : "border-neutral-200 text-neutral-300 cursor-default"
    }`

  const smallOutlineBtn =
    "font-mono text-sm uppercase tracking-wide px-5 py-2 border border-neutral-200 text-neutral-400 hover:text-neutral-700 transition-colors cursor-pointer"

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div
      ref={topRef}
      className="fixed inset-0 z-0 overflow-y-auto bg-[linear-gradient(to_bottom_right,#00a6f3_0%,#00a6f3_35%,#cdeefc_62%,#f5fafc_82%,#fefefe_100%)]"
    >
      {/* Globe background */}
      <div
        className="pointer-events-none fixed"
        style={{
          top: "50%",
          left: "50%",
          width: "min(90vw, 90vh)",
          height: "min(90vw, 90vh)",
          transform: "translate(-5%, -20%) rotate(30deg)",
          opacity: 0.3,
          zIndex: 0,
        }}
      >
        <Lottie animationData={globeAnimation} loop autoplay initialSegment={[0, 151]} />
      </div>

      <div className="relative z-10 flex justify-center px-5 pb-48 pt-28 md:pt-32">
        <AnimatePresence mode="wait">

          {/* ══ Confirmation screen ══════════════════════════════════════════ */}
          {confirmed ? (
            <motion.div
              key="confirmation"
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.55, ease: "easeOut" }}
              className="w-full max-w-2xl bg-white rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.14)] px-8 py-10 md:px-12 md:py-12"
            >
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent-navbar mb-3">
                You&apos;re in.
              </p>
              <h1 className="font-serif text-4xl tracking-[-0.05em] text-neutral-900 leading-[0.95] mb-10 md:text-5xl">
                Welcome to the Hopamine Network.
              </h1>

              {/* Discord CTA */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.4 }}
                className="mb-10"
              >
                <p className="font-serif text-xl text-neutral-700 mb-5">
                  The real work happens in our community.
                </p>
                <a
                  href="https://discord.gg/ESymdPMhCD"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2.5 font-mono text-sm uppercase tracking-wide px-6 py-3 bg-[#5865F2] text-white hover:bg-[#4752c4] transition-colors"
                >
                  {/* Discord glyph */}
                  <svg width="18" height="14" viewBox="0 0 18 14" fill="none" aria-hidden="true">
                    <path
                      d="M15.245 1.175A14.81 14.81 0 0 0 11.587 0c-.162.29-.35.68-.48.99a13.705 13.705 0 0 0-4.214 0A10.68 10.68 0 0 0 6.41 0 14.855 14.855 0 0 0 2.75 1.178C.395 4.703-.242 8.14.076 11.527a15.01 15.01 0 0 0 4.591 2.347c.37-.507.7-1.047.982-1.617a9.69 9.69 0 0 1-1.546-.749c.13-.096.257-.195.38-.298 2.978 1.39 6.212 1.39 9.153 0 .124.103.252.202.38.298-.491.293-1.011.547-1.549.75.283.57.612 1.111.982 1.617a14.99 14.99 0 0 0 4.593-2.348c.376-3.965-.637-7.367-2.797-10.352ZM6.013 9.44c-.908 0-1.655-.845-1.655-1.879 0-1.034.73-1.88 1.655-1.88.924 0 1.67.846 1.655 1.88 0 1.034-.73 1.88-1.655 1.88Zm6.14 0c-.908 0-1.655-.845-1.655-1.879 0-1.034.73-1.88 1.655-1.88.924 0 1.67.846 1.655 1.88 0 1.034-.73 1.88-1.655 1.88Z"
                      fill="currentColor"
                    />
                  </svg>
                  Join us on Discord
                </a>
              </motion.div>

              {/* Soft offer — first project, skippable */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.75, duration: 0.4 }}
                className="flex flex-col gap-3 sm:flex-row sm:flex-wrap"
              >
                <button
                  onClick={() => router.push("/onboard/project?from=onboard")}
                  className="font-mono text-sm uppercase tracking-wide px-6 py-2.5 border-2 border-accent-navbar bg-accent-navbar text-white transition-colors cursor-pointer hover:brightness-[0.97]"
                >
                  Add your first project →
                </button>
                <button
                  onClick={() => router.push("/dashboard")}
                  className={outlineBtn(true)}
                >
                  Skip for now →
                </button>
              </motion.div>
            </motion.div>

          ) : (

          /* ══ Onboarding questions ════════════════════════════════════════ */
          <motion.div
            key="onboard"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="w-full max-w-2xl bg-white rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.14)] px-8 py-10 md:px-12 md:py-12"
          >
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent-navbar mb-3">
              The Hopamine Network
            </p>
            <h1 className={`${robotoFlex.className} text-4xl font-semibold tracking-[-0.02em] text-neutral-900 leading-[0.95] mb-10 md:text-5xl`}>
              Welcome to Hopamine.
            </h1>

            <div className="space-y-8">

              {/* Q1 — Name ─────────────────────────────────────────────── */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.6 }}
              >
                <AnimatePresence mode="wait">
                  {!nameDone ? (
                    <motion.div key="q1-ask" exit={{ opacity: 0, transition: { duration: 0.2 } }}>
                      <p className={`${questionClass} mb-5`}>What&apos;s your name?</p>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Your name"
                        onKeyDown={(e) => e.key === "Enter" && submitName()}
                        className={questionInputLineClass}
                      />
                      <button onClick={submitName} disabled={!name.trim()} className={outlineBtn(!!name.trim())}>
                        Continue
                      </button>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="q1-done"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.5 }}
                      onClick={() => setNameDone(false)}
                      className="cursor-pointer hover:opacity-70 transition-opacity group"
                    >
                      <p className={questionAnswerClass}>
                        I&apos;m <span className="text-accent-navbar">{name}</span>.
                        <span className="ml-2 font-mono text-xs text-neutral-900 opacity-0 group-hover:opacity-100 transition-opacity align-middle">edit</span>
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Q2 — Username ─────────────────────────────────────────── */}
              <AnimatePresence>
                {nameDone && (
                  <motion.div
                    key="q2-username"
                    initial={{ opacity: 0, y: 22 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.55, ease: "easeOut" }}
                  >
                    <AnimatePresence mode="wait">
                      {!usernameDone ? (
                        <motion.div key="q2u-ask" exit={{ opacity: 0, transition: { duration: 0.2 } }}>
                          <p className={`${questionClass} mb-1`}>Pick your Hopamine username.</p>
                          <p className="font-mono text-xs text-neutral-400 mb-5">
                            Lowercase, no spaces. Skip and we&apos;ll generate one for you.
                          </p>
                          <input
                            autoFocus
                            type="text"
                            value={username}
                            onChange={(e) => {
                              setUsername(e.target.value)
                              setUsernameError("")
                            }}
                            onKeyDown={(e) => e.key === "Enter" && submitUsername()}
                            placeholder="yourname"
                            className={questionInputLineClass}
                          />
                          {usernameError ? (
                            <p className="font-mono text-xs text-red-500 mb-3">{usernameError}</p>
                          ) : null}
                          <div className="flex items-center gap-3 mt-4">
                            <button
                              onClick={submitUsername}
                              disabled={!username.trim()}
                              className={outlineBtn(!!username.trim())}
                            >
                              Continue
                            </button>
                            <button
                              onClick={() => {
                                setUsername("")
                                setUsernameError("")
                                setUsernameDone(true)
                                scrollDown()
                              }}
                              className={smallOutlineBtn}
                            >
                              Skip
                            </button>
                          </div>
                        </motion.div>
                      ) : (
                        <motion.div
                          key="q2u-done"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.5 }}
                          onClick={() => setUsernameDone(false)}
                          className="cursor-pointer hover:opacity-70 transition-opacity group"
                        >
                          <p className={questionAnswerClass}>
                            Username:{" "}
                            <span className="text-accent-navbar">
                              {username.trim() ? `@${username.replace(/^@/, "")}` : "we'll generate one"}
                            </span>
                            <span className="ml-2 font-mono text-xs text-neutral-900 opacity-0 group-hover:opacity-100 transition-opacity align-middle">
                              edit
                            </span>
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Q3 — Location ──────────────────────────────────────────── */}
              <AnimatePresence>
                {usernameDone && (
                  <motion.div
                    key="q2"
                    initial={{ opacity: 0, y: 22 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.55, ease: "easeOut" }}
                  >
                    <AnimatePresence mode="wait">
                      {!locationDone ? (
                        <motion.div key="q2-ask" exit={{ opacity: 0, transition: { duration: 0.2 } }}>
                          <p className={`${questionClass} mb-5`}>
                            Where are you building from?
                          </p>
                          <input
                            autoFocus
                            type="text"
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && submitLocation()}
                            placeholder="Type your city…"
                            className={questionInputLineClass}
                          />
                          <button
                            onClick={submitLocation}
                            disabled={!location.trim()}
                            className={outlineBtn(!!location.trim())}
                          >
                            Continue
                          </button>
                        </motion.div>
                      ) : (
                        <motion.div
                          key="q2-done"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.5 }}
                          onClick={() => setLocationDone(false)}
                          className="cursor-pointer hover:opacity-70 transition-opacity group"
                        >
                          <p className={questionAnswerClass}>
                            I&apos;m building from <span className="text-accent-navbar">{location}</span>.
                            <span className="ml-2 font-mono text-xs text-neutral-900 opacity-0 group-hover:opacity-100 transition-opacity align-middle">edit</span>
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Q4 — Bio ─────────────────────────────────────────────── */}
              <AnimatePresence>
                {locationDone && (
                  <motion.div
                    key="q4-bio"
                    initial={{ opacity: 0, y: 22 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.55, ease: "easeOut" }}
                  >
                    <AnimatePresence mode="wait">
                      {!bioDone ? (
                        <motion.div key="q4b-ask" exit={{ opacity: 0, transition: { duration: 0.2 } }}>
                          <p className={`${questionClass} mb-5`}>Write a short bio.</p>
                          <AutoTextarea
                            value={bioDraft}
                            onChange={setBioDraft}
                            placeholder="A short intro about you…"
                          />
                          <div className="mt-4 flex items-center gap-4">
                            <button
                              onClick={submitBio}
                              disabled={!bioDraft.trim()}
                              className={outlineBtn(!!bioDraft.trim())}
                            >
                              Continue
                            </button>
                          </div>
                        </motion.div>
                      ) : editingBio ? (
                        <motion.div key="q4b-edit" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                          <p className={`${questionClass} mb-5`}>Write a short bio.</p>
                          <AutoTextarea value={tempBio} onChange={setTempBio} placeholder="A short intro about you…" />
                          <div className="mt-4 flex items-center gap-4">
                            <button onClick={saveBio} disabled={!tempBio.trim()} className={outlineBtn(!!tempBio.trim())}>
                              Save
                            </button>
                            <button onClick={() => setEditingBio(false)} className={smallOutlineBtn}>
                              Cancel
                            </button>
                          </div>
                        </motion.div>
                      ) : (
                        <motion.div
                          key="q4b-done"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.5 }}
                          onClick={() => {
                            setTempBio(bio)
                            setEditingBio(true)
                          }}
                          className="cursor-pointer hover:opacity-70 transition-opacity group"
                        >
                          <p className={`${questionAnswerClass} mb-3`}>
                            Bio:
                            <span className="ml-2 font-mono text-xs text-neutral-900 opacity-0 group-hover:opacity-100 transition-opacity align-middle">
                              edit
                            </span>
                          </p>
                          <p className={`${robotoFlex.className} text-3xl text-accent-navbar leading-snug`}>
                            &ldquo;{displayBio}&rdquo;
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Q5 — Skills ────────────────────────────────────────────── */}
              <AnimatePresence>
                {bioDone && (
                  <motion.div
                    key="q4"
                    initial={{ opacity: 0, y: 22 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.55, ease: "easeOut" }}
                  >
                    <AnimatePresence mode="wait">
                      {!skillsDone ? (
                        <motion.div key="q4-ask" exit={{ opacity: 0, transition: { duration: 0.2 } }}>
                          <p className={`${questionClass} mb-5`}>What are your core skills?</p>
                          <div className="space-y-3 mb-4">
                            {skillsList.map((skill, i) => (
                              <div key={i} className="flex items-center gap-3">
                                <input
                                  value={skill}
                                  onChange={(e) => {
                                    const next = [...skillsList]
                                    next[i] = e.target.value
                                    setSkillsList(next)
                                  }}
                                  maxLength={35}
                                  placeholder={i === 0 ? "Permaculture design…" : i === 1 ? "Regenerative agriculture…" : `Skill ${i + 1}…`}
                                  className={questionInputSmClass}
                                />
                                {skillsList.length > 1 && (
                                  <button
                                    onClick={() => setSkillsList(skillsList.filter((_, j) => j !== i))}
                                    className="text-neutral-300 hover:text-neutral-400 transition-colors font-mono text-xl leading-none pb-1"
                                  >
                                    ×
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                          {skillsList.length < 5 && (
                            <button
                              onClick={() => setSkillsList([...skillsList, ""])}
                              className="flex items-center gap-1.5 font-mono text-sm text-accent-navbar hover:text-[#0090d4] transition-colors mb-5"
                            >
                              <span className="text-xl font-light leading-none">+</span>
                              <span>Add skill</span>
                            </button>
                          )}
                          <button
                            onClick={submitSkills}
                            disabled={!skillsList.some((s) => s.trim())}
                            className={outlineBtn(skillsList.some((s) => s.trim()))}
                          >
                            Continue
                          </button>
                        </motion.div>
                      ) : editingSkills ? (
                        <motion.div key="q4-edit" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                          <p className={`${questionClass} mb-5`}>What are your core skills?</p>
                          <div className="space-y-3 mb-4">
                            {tempSkillsList.map((skill, i) => (
                              <div key={i} className="flex items-center gap-3">
                                <input
                                  value={skill}
                                  onChange={(e) => {
                                    const next = [...tempSkillsList]
                                    next[i] = e.target.value
                                    setTempSkillsList(next)
                                  }}
                                  maxLength={35}
                                  placeholder={`Skill ${i + 1}…`}
                                  className={questionInputSmClass}
                                />
                                {tempSkillsList.length > 1 && (
                                  <button
                                    onClick={() => setTempSkillsList(tempSkillsList.filter((_, j) => j !== i))}
                                    className="text-neutral-300 hover:text-neutral-400 transition-colors font-mono text-xl leading-none pb-1"
                                  >
                                    ×
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                          {tempSkillsList.length < 5 && (
                            <button
                              onClick={() => setTempSkillsList([...tempSkillsList, ""])}
                              className="flex items-center gap-1.5 font-mono text-sm text-accent-navbar hover:text-[#0090d4] transition-colors mb-4"
                            >
                              <span className="text-xl font-light leading-none">+</span>
                              <span>Add skill</span>
                            </button>
                          )}
                          <div className="mt-2 flex items-center gap-4">
                            <button
                              onClick={saveSkills}
                              disabled={!tempSkillsList.some((s) => s.trim())}
                              className={outlineBtn(tempSkillsList.some((s) => s.trim())).replace("px-6 py-2.5", "px-5 py-2")}
                            >
                              Save
                            </button>
                            <button onClick={() => setEditingSkills(false)} className={smallOutlineBtn}>Cancel</button>
                          </div>
                        </motion.div>
                      ) : (
                        <motion.div
                          key="q4-done"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.5 }}
                          onClick={() => { setTempSkillsList([...skillsList]); setEditingSkills(true) }}
                          className="cursor-pointer hover:opacity-70 transition-opacity group"
                        >
                          <p className={`${questionAnswerClass} mb-3`}>
                            Core skills:
                            <span className="ml-2 font-mono text-xs text-neutral-900 opacity-0 group-hover:opacity-100 transition-opacity align-middle">edit</span>
                          </p>
                          <ul className="flex flex-col gap-1.5">
                            {skillsList.filter((s) => s.trim()).map((s, i) => (
                              <li key={i} className={`${robotoFlex.className} text-2xl text-accent-navbar`}>
                                {s}
                              </li>
                            ))}
                          </ul>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Q5 — Vision ────────────────────────────────────────────── */}
              <AnimatePresence>
                {skillsDone && (
                  <motion.div
                    key="q5"
                    initial={{ opacity: 0, y: 22 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.55, ease: "easeOut" }}
                  >
                    <AnimatePresence mode="wait">
                      {!visionDone ? (
                        <motion.div key="q5-ask" exit={{ opacity: 0, transition: { duration: 0.2 } }}>
                          <p className={`${questionClass} mb-5`}>What&apos;s your vision for the future?</p>
                          <AutoTextarea value={visionDraft} onChange={setVisionDraft} placeholder="Describe your vision…" />
                          <div className="mt-4 flex items-center gap-4">
                            <button onClick={submitVision} disabled={!visionDraft.trim()} className={outlineBtn(!!visionDraft.trim())}>
                              Continue
                            </button>
                            <span className="font-mono text-xs text-neutral-300">
                              {visionDraft.trim().split(/\s+/).filter(Boolean).length} words
                            </span>
                          </div>
                        </motion.div>
                      ) : editingVision ? (
                        <motion.div key="q5-edit" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                          <p className={`${questionClass} mb-5`}>What&apos;s your vision for the future?</p>
                          <AutoTextarea value={tempVision} onChange={setTempVision} placeholder="Describe your vision…" />
                          <div className="mt-4 flex items-center gap-4">
                            <button onClick={saveVision} disabled={!tempVision.trim()} className={outlineBtn(!!tempVision.trim())}>
                              Save
                            </button>
                            <button onClick={() => setEditingVision(false)} className={smallOutlineBtn}>Cancel</button>
                            <span className="font-mono text-xs text-neutral-300 ml-auto">
                              {tempVision.trim().split(/\s+/).filter(Boolean).length} words
                            </span>
                          </div>
                        </motion.div>
                      ) : (
                        <motion.div
                          key="q5-done"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.5 }}
                          onClick={() => { setTempVision(vision); setEditingVision(true) }}
                          className="cursor-pointer hover:opacity-70 transition-opacity group"
                        >
                          <p className={`${questionAnswerClass} mb-3`}>
                            Your vision:
                            <span className="ml-2 font-mono text-xs text-neutral-900 opacity-0 group-hover:opacity-100 transition-opacity align-middle">edit</span>
                          </p>
                          <p className={`${robotoFlex.className} text-3xl text-accent-navbar leading-snug`}>
                            &ldquo;{displayVision}&rdquo;
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Q6 — Why ──────────────────────────────────────────────── */}
              <AnimatePresence>
                {visionDone && (
                  <motion.div
                    key="q6"
                    initial={{ opacity: 0, y: 22 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.55, ease: "easeOut" }}
                  >
                    <AnimatePresence mode="wait">
                      {!done ? (
                        <motion.div key="q6-ask" exit={{ opacity: 0, transition: { duration: 0.2 } }}>
                          <p className={`${questionClass} mb-5`}>
                            Why does this movement matter to you?
                          </p>
                          <AutoTextarea
                            value={whyDraft}
                            onChange={setWhyDraft}
                            placeholder="Share what draws you to this work…"
                          />
                          <div className="mt-4 flex items-center gap-4">
                            <button
                              onClick={submitWhy}
                              disabled={!whyDraft.trim()}
                              className={outlineBtn(!!whyDraft.trim())}
                            >
                              Continue
                            </button>
                            <span className="font-mono text-xs text-neutral-300">
                              {whyDraft.trim().split(/\s+/).filter(Boolean).length} words
                            </span>
                          </div>
                        </motion.div>
                      ) : (
                        <motion.div key="q6-done" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
                          <p className={`${questionAnswerClass} mb-3`}>
                            Why does this movement matter to you?
                          </p>
                          <p className={`${robotoFlex.className} text-3xl text-accent-navbar leading-snug italic`}>
                            &ldquo;{why}&rdquo;
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Q7 — Learning ─────────────────────────────────────────── */}
              <AnimatePresence>
                {done && (
                  <motion.div
                    key="q7-learning"
                    initial={{ opacity: 0, y: 22 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.55, ease: "easeOut" }}
                  >
                    <AnimatePresence mode="wait">
                      {!learningDone ? (
                        <motion.div key="q7l-ask" exit={{ opacity: 0, transition: { duration: 0.2 } }}>
                          <p className={`${questionClass} mb-5`}>
                            What are you learning about right now?
                          </p>
                          <AutoTextarea
                            value={learningDraft}
                            onChange={setLearningDraft}
                            placeholder="Share what's capturing your curiosity…"
                          />
                          <div className="mt-4 flex items-center gap-4">
                            <button
                              onClick={submitLearning}
                              disabled={!learningDraft.trim()}
                              className={outlineBtn(!!learningDraft.trim())}
                            >
                              Continue
                            </button>
                            <span className="font-mono text-xs text-neutral-300">
                              {learningDraft.trim().split(/\s+/).filter(Boolean).length} words
                            </span>
                          </div>
                        </motion.div>
                      ) : editingLearning ? (
                        <motion.div key="q7l-edit" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                          <p className={`${questionClass} mb-5`}>
                            What are you learning about right now?
                          </p>
                          <AutoTextarea value={tempLearning} onChange={setTempLearning} placeholder="Share what's capturing your curiosity…" />
                          <div className="mt-4 flex items-center gap-4">
                            <button onClick={saveLearning} disabled={!tempLearning.trim()} className={outlineBtn(!!tempLearning.trim())}>
                              Save
                            </button>
                            <button onClick={() => setEditingLearning(false)} className={smallOutlineBtn}>Cancel</button>
                            <span className="font-mono text-xs text-neutral-300 ml-auto">
                              {tempLearning.trim().split(/\s+/).filter(Boolean).length} words
                            </span>
                          </div>
                        </motion.div>
                      ) : (
                        <motion.div
                          key="q7l-done"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.5 }}
                          onClick={() => { setTempLearning(learning); setEditingLearning(true) }}
                          className="cursor-pointer hover:opacity-70 transition-opacity group"
                        >
                          <p className={`${questionAnswerClass} mb-3`}>
                            What you&apos;re learning:
                            <span className="ml-2 font-mono text-xs text-neutral-900 opacity-0 group-hover:opacity-100 transition-opacity align-middle">edit</span>
                          </p>
                          <p className={`${robotoFlex.className} text-3xl text-accent-navbar leading-snug italic`}>
                            &ldquo;{learning}&rdquo;
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Q8 — Movies ───────────────────────────────────────────── */}
              <AnimatePresence>
                {learningDone && (
                  <motion.div
                    key="q8-movies"
                    initial={{ opacity: 0, y: 22 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.55, ease: "easeOut" }}
                  >
                    <AnimatePresence mode="wait">
                      {!moviesDone ? (
                        <motion.div key="q8m-ask" exit={{ opacity: 0, transition: { duration: 0.2 } }}>
                          <p className={`${questionClass} mb-1`}>
                            What are some of your favorite movies?
                          </p>
                          <p className="font-mono text-xs text-neutral-400 mb-5">
                            Any culture. Search and pick a few.
                          </p>
                          <MoviePicker selected={selectedMovies} onChange={setSelectedMovies} />
                          <div className="mt-5 flex items-center gap-3">
                            <button
                              onClick={submitMovies}
                              disabled={selectedMovies.length === 0}
                              className={outlineBtn(selectedMovies.length > 0)}
                            >
                              Continue
                            </button>
                            <button
                              onClick={() => {
                                setSelectedMovies([])
                                setMoviesDone(true)
                                scrollDown()
                              }}
                              className={smallOutlineBtn}
                            >
                              Skip
                            </button>
                          </div>
                        </motion.div>
                      ) : (
                        <motion.div
                          key="q8m-done"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.5 }}
                          onClick={() => setMoviesDone(false)}
                          className="cursor-pointer hover:opacity-70 transition-opacity group"
                        >
                          <p className={`${questionAnswerClass} mb-3`}>
                            Favorite movies:
                            <span className="ml-2 font-mono text-xs text-neutral-900 opacity-0 group-hover:opacity-100 transition-opacity align-middle">
                              edit
                            </span>
                          </p>
                          {selectedMovies.length > 0 ? (
                            <ul className="flex flex-col gap-1.5">
                              {selectedMovies.map((movie) => (
                                <li
                                  key={movie.id}
                                  className={`${robotoFlex.className} text-2xl text-accent-navbar`}
                                >
                                  {movie.title}
                                  {movie.year ? ` (${movie.year})` : ""}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className={`${robotoFlex.className} text-2xl text-accent-navbar`}>
                              skipped
                            </p>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Q9 — Music ────────────────────────────────────────────── */}
              <AnimatePresence>
                {moviesDone && (
                  <motion.div
                    key="q9-music"
                    initial={{ opacity: 0, y: 22 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.55, ease: "easeOut" }}
                  >
                    <AnimatePresence mode="wait">
                      {!musicDone ? (
                        <motion.div key="q9mu-ask" exit={{ opacity: 0, transition: { duration: 0.2 } }}>
                          <p className={`${questionClass} mb-1`}>
                            What kind of music do you listen to?
                          </p>
                          <p className="font-mono text-xs text-neutral-400 mb-5">
                            Search songs or artists and pick a few.
                          </p>
                          <MusicPicker selected={selectedMusic} onChange={setSelectedMusic} />
                          <div className="mt-5 flex items-center gap-3">
                            <button
                              onClick={submitMusic}
                              disabled={selectedMusic.length === 0}
                              className={outlineBtn(selectedMusic.length > 0)}
                            >
                              Continue
                            </button>
                            <button
                              onClick={() => {
                                setSelectedMusic([])
                                setMusicDone(true)
                                scrollDown()
                              }}
                              className={smallOutlineBtn}
                            >
                              Skip
                            </button>
                          </div>
                        </motion.div>
                      ) : (
                        <motion.div
                          key="q9mu-done"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.5 }}
                          onClick={() => setMusicDone(false)}
                          className="cursor-pointer hover:opacity-70 transition-opacity group"
                        >
                          <p className={`${questionAnswerClass} mb-3`}>
                            Music you listen to:
                            <span className="ml-2 font-mono text-xs text-neutral-900 opacity-0 group-hover:opacity-100 transition-opacity align-middle">
                              edit
                            </span>
                          </p>
                          {selectedMusic.length > 0 ? (
                            <ul className="flex flex-col gap-1.5">
                              {selectedMusic.map((track) => (
                                <li
                                  key={track.id}
                                  className={`${robotoFlex.className} text-2xl text-accent-navbar`}
                                >
                                  {track.title}
                                  <span className="text-neutral-400"> — {track.artist}</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className={`${robotoFlex.className} text-2xl text-accent-navbar`}>
                              skipped
                            </p>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Q10 — Discord ─────────────────────────────────────────── */}
              <AnimatePresence>
                {musicDone && (
                  <motion.div
                    key="q7"
                    initial={{ opacity: 0, y: 22 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.55, ease: "easeOut" }}
                  >
                    <AnimatePresence mode="wait">
                      {!discordDone ? (
                        <motion.div key="q7-ask" exit={{ opacity: 0, transition: { duration: 0.2 } }}>
                          <p className={`${questionClass} mb-1`}>
                            What&apos;s your Discord? <span className="font-mono text-sm text-neutral-400">(optional)</span>
                          </p>
                          <p className="font-mono text-xs text-neutral-400 mb-5">Others can copy your username to add you directly.</p>
                          <input
                            type="text"
                            value={discord}
                            onChange={(e) => { setDiscord(e.target.value); setDiscordError("") }}
                            onKeyDown={(e) => e.key === "Enter" && submitDiscord()}
                            placeholder="yourname"
                            className={`w-full bg-transparent ${robotoFlex.className} text-xl text-neutral-700 placeholder:text-neutral-300 focus:outline-none border-b border-neutral-200 focus:border-accent-navbar transition-colors pb-2 mb-2`}
                          />
                          {discordError && (
                            <p className="font-mono text-xs text-red-500 mb-3">{discordError}</p>
                          )}
                          <div className="flex items-center gap-3 mt-4">
                            <button onClick={submitDiscord} className={outlineBtn(true)}>
                              Continue
                            </button>
                            <button
                              onClick={() => { setDiscord(""); setDiscordError(""); setDiscordDone(true); scrollDown() }}
                              className={smallOutlineBtn}
                            >
                              Skip
                            </button>
                          </div>
                        </motion.div>
                      ) : (
                        <motion.div
                          key="q7-done"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.5 }}
                          onClick={() => setDiscordDone(false)}
                          className="cursor-pointer hover:opacity-70 transition-opacity group"
                        >
                          <p className={questionAnswerClass}>
                            Discord:{" "}
                            <span className="text-accent-navbar">
                              {discord.trim() ? discord.replace(/^https?:\/\//, "") : "skipped"}
                            </span>
                            <span className="ml-2 font-mono text-xs text-neutral-900 opacity-0 group-hover:opacity-100 transition-opacity align-middle">edit</span>
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Finish CTA ─────────────────────────────────────────────── */}
              <AnimatePresence>
                {discordDone && (
                  <motion.div
                    key="done"
                    initial={{ opacity: 0, y: 22 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="pt-6 border-t border-neutral-100"
                  >
                    <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent-navbar mb-3">
                      Welcome to the network.
                    </p>
                    <h2 className="font-serif text-4xl tracking-[-0.04em] text-neutral-900 mb-8">
                      Now let&apos;s build something.
                    </h2>
                    <button
                      onClick={() => void finishOnboarding()}
                      disabled={submitting || isAuthLoading || !isAuthenticated}
                      className={`font-mono text-sm uppercase tracking-wide px-8 py-3 transition-colors cursor-pointer ${
                        submitting || isAuthLoading || !isAuthenticated
                          ? "bg-neutral-200 text-neutral-400 cursor-default"
                          : "bg-accent-navbar text-white hover:bg-[#0090d4]"
                      }`}
                    >
                      {submitting ? "Saving…" : isAuthLoading ? "Loading…" : "Submit →"}
                    </button>
                    {submitError && (
                      <p className="mt-3 font-mono text-xs text-red-500">{submitError}</p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

            </div>
            <div ref={endRef} className="h-1" />
          </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
