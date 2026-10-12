"use node";

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { v } from "convex/values";
import { z } from "zod";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { action } from "./_generated/server";
import { zimaSearchCityById } from "../shared/zimaSearchCities";
import {
  zimaSearchArgs,
  zimaSearchResultValidator,
  type ZimaSearchResult,
} from "./zimaSearch";

/** Picking six profiles from a few hundred short lines is routine, so the cheapest current model does it. */
const CLAUDE_MODEL = "claude-haiku-4-5";
const RESULT_COUNT = 6;
const MAX_BIO_CHARS_IN_PROMPT = 300;
const PICK_MAX_TOKENS = 1024;

const PickSchema = z.object({
  ids: z.array(z.string()),
});

function describeCandidateForPrompt(candidate: ZimaSearchResult): string {
  const bio = (candidate.bio ?? "").replace(/\s+/g, " ").slice(0, MAX_BIO_CHARS_IN_PROMPT);
  return [
    `id: ${candidate._id}`,
    `name: ${candidate.name}`,
    `location: ${candidate.location}`,
    `archetypes: ${candidate.skills.join(", ") || "none"}`,
    `interests: ${candidate.interests.join(", ") || "none"}`,
    `bio: ${bio || "none"}`,
  ].join(" | ");
}

async function pickCandidateIdsWithClaude(
  client: Anthropic,
  searchText: string,
  cityLabel: string,
  candidates: ZimaSearchResult[],
): Promise<string[]> {
  const systemPrompt = [
    `You pick profiles of builders in ${cityLabel} for a people search.`,
    `Given the search text and a list of candidate profiles, return the ids of the ${RESULT_COUNT} profiles that best fit the search, most relevant first.`,
    `Return fewer than ${RESULT_COUNT} only when fewer candidates fit at all. If the search is generic, pick the most interesting ${RESULT_COUNT} for it.`,
    "Never invent ids; only use ids from the candidate list.",
  ].join(" ");
  const userPrompt = `Search: ${searchText || `future builders in ${cityLabel}`}\n\nCandidates:\n${candidates
    .map(describeCandidateForPrompt)
    .join("\n")}`;

  const response = await client.messages.parse({
    model: CLAUDE_MODEL,
    max_tokens: PICK_MAX_TOKENS,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
    output_config: { format: zodOutputFormat(PickSchema) },
  });

  if (response.stop_reason === "refusal") {
    throw new Error("Claude declined to pick profiles for this search");
  }
  const parsed = response.parsed_output;
  if (!parsed) throw new Error("Claude returned no parseable picks");
  return parsed.ids;
}

/**
 * Chip filters narrow in the database, then Claude picks the best six for
 * the query text. If the model call fails, the newest six candidates are
 * returned so the map never goes dark.
 */
export const search = action({
  args: zimaSearchArgs,
  returns: v.array(zimaSearchResultValidator),
  handler: async (ctx, args): Promise<ZimaSearchResult[]> => {
    const candidates: ZimaSearchResult[] = await ctx.runQuery(
      internal.zimaSearch.candidates,
      args,
    );
    if (candidates.length <= RESULT_COUNT) return candidates;

    const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
    if (!apiKey) {
      throw new Error(
        "ANTHROPIC_API_KEY is not set on the Convex deployment. Run: npx convex env set ANTHROPIC_API_KEY <key>",
      );
    }

    const client = new Anthropic({ apiKey });
    let pickedIds: string[];
    try {
      const cityLabel = zimaSearchCityById(args.city).label;
      pickedIds = await pickCandidateIdsWithClaude(
        client,
        args.text,
        cityLabel,
        candidates,
      );
    } catch (error) {
      console.error("Zima search model call failed, returning newest candidates", error);
      return candidates.slice(0, RESULT_COUNT);
    }

    const candidatesById = new Map(candidates.map((candidate) => [candidate._id, candidate]));
    const picked: ZimaSearchResult[] = [];
    for (const id of pickedIds) {
      const candidate = candidatesById.get(id as Id<"users">);
      if (candidate && !picked.includes(candidate)) picked.push(candidate);
      if (picked.length === RESULT_COUNT) break;
    }
    return picked.length > 0 ? picked : candidates.slice(0, RESULT_COUNT);
  },
});
