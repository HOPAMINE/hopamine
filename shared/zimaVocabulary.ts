/**
 * Single source of truth for the archetype and interest chips. Onboarding
 * saves these labels on the user, and the search filters match against them,
 * so both sides must read from here.
 */
/** Previous chips. Kept so older profiles still resolve, and hidden from the pickers. */
export const ZIMA_LEGACY_ARCHETYPES = [
  "Scientist",
  "Creator",
  "Filmmaker",
  "Writer",
  "Technologist",
  "Builder",
  "Farmer",
  "Designer",
  "Developer",
  "Artist",
  "Policy maker",
  "Community builder",
  "Engineer",
  "Researcher",
  "Founder",
  "Educator",
  "Journalist",
  "Photographer",
  "Musician",
  "Architect",
  "Organizer",
  "Activist",
  "Chef",
  "Maker",
  "Inventor",
  "Student",
  "Poet",
  "Producer",
  "Animator",
  "Illustrator",
  "Urbanist",
  "Ecologist",
  "Gardener",
  "Curator",
  "Hacker",
] as const;

export const ZIMA_STORY_ARCHETYPES = [
  {
    emoji: "🌱",
    label: "The Seedcaster",
    description: "They plant what others haven't imagined yet.",
  },
  {
    emoji: "⚙️",
    label: "The Fabricant",
    description: "If it doesn't exist, they build it.",
  },
  {
    emoji: "🍄",
    label: "The Mycelian",
    description: "They think in networks and grow in the dark.",
  },
  {
    emoji: "🏗️",
    label: "The Terraformer",
    description: "They redesign the spaces we inhabit.",
  },
  {
    emoji: "💻",
    label: "The Developer",
    description: "They write the tools of sovereignty.",
  },
  {
    emoji: "🎨",
    label: "The Artisan",
    description: "They make the future beautiful enough to want.",
  },
  {
    emoji: "📡",
    label: "The Chronicler",
    description: "They make sure the work gets seen.",
  },
  {
    emoji: "🌿",
    label: "The Cultivar",
    description: "They bridge the lab and the land.",
  },
  {
    emoji: "🔗",
    label: "The Loomkeeper",
    description: "They hold the network together.",
  },
  {
    emoji: "📜",
    label: "The Verdant",
    description: "They change the rules of the game.",
  },
] as const;

/** Labels shown in onboarding, search, and profile editing. */
export const ZIMA_ARCHETYPES = ZIMA_STORY_ARCHETYPES.map((archetype) => archetype.label);

/** Chips on the onboarding step. */
export const ZIMA_ONBOARD_ARCHETYPES = ZIMA_ARCHETYPES;

export const ZIMA_PRIMARY_INTERESTS = [
  "Civic",
  "Nature",
  "Technology",
  "Climate",
  "Community",
  "Urban farming",
  "Mutual aid",
  "Parks",
] as const;

export const ZIMA_MORE_INTERESTS = [
  "Compost",
  "Zero waste",
  "Energy",
  "Housing",
  "Food systems",
  "Biodiversity",
  "Repair",
  "Education",
] as const;

export const ZIMA_INTERESTS = [
  ...ZIMA_PRIMARY_INTERESTS,
  ...ZIMA_MORE_INTERESTS,
] as const;

/** Why someone showed up, saved from Zima onboarding. */
export const ZIMA_CONTRIBUTE_INTENT =
  "Looking to contribute to a project" as const;

export const ZIMA_INTENTS = [
  ZIMA_CONTRIBUTE_INTENT,
  "Looking for people to help me with a project",
  "Looking to meet other builders",
  "Just seeing what's out there",
] as const;

export function canonicalZimaIntent(raw: string): (typeof ZIMA_INTENTS)[number] | null {
  const trimmed = raw.trim().replace(/\s+/g, " ");
  return ZIMA_INTENTS.find((option) => option === trimmed) ?? null;
}

/**
 * Lowercases, strips punctuation and drops a trailing "s" from each word so
 * "Policy makers" saved by older onboarding still matches "Policy maker".
 */
export function normalizeZimaTag(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .map((word) => (word.length > 3 ? word.replace(/s$/, "") : word))
    .join(" ");
}

/** Canonical label when `raw` matches the list, otherwise the trimmed text. */
export function canonicalZimaArchetype(raw: string): string | null {
  const trimmed = raw.trim().replace(/\s+/g, " ");
  if (!trimmed || trimmed.length > 40) return null;
  const match = [...ZIMA_ARCHETYPES, ...ZIMA_LEGACY_ARCHETYPES].find(
    (option) => option.toLowerCase() === trimmed.toLowerCase(),
  );
  return match ?? trimmed;
}

/** Adds a typed archetype, skipping blanks and duplicates. */
export function addZimaArchetype(current: readonly string[], raw: string): string[] {
  const label = canonicalZimaArchetype(raw);
  if (!label) return [...current];
  if (current.some((item) => item.toLowerCase() === label.toLowerCase())) {
    return [...current];
  }
  return [...current, label];
}

/**
 * Archetypes saved on the profile, or the onboarding list stored in skills
 * before the profile field existed.
 */
export function profileArchetypes(user: {
  archetypes?: string[];
  skills?: string[];
}): string[] {
  const source = user.archetypes !== undefined ? user.archetypes : (user.skills ?? []);
  const seen = new Set<string>();
  const labels: string[] = [];
  for (const item of source) {
    const label = canonicalZimaArchetype(item);
    if (!label) continue;
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    labels.push(label);
  }
  return labels;
}

/** True when any of the user's saved tags equals any of the selected chips, or no chips are selected. */
export function hasAnyMatchingTag(
  savedTags: readonly string[],
  selectedTags: readonly string[],
): boolean {
  if (selectedTags.length === 0) return true;
  const selected = new Set(selectedTags.map(normalizeZimaTag));
  return savedTags.some((tag) => selected.has(normalizeZimaTag(tag)));
}
