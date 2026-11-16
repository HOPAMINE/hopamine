/** How a project signals it wants people. */

export const PROJECT_SEEKING_CONTRIBUTORS_LABEL =
  "Looking for contributors" as const;

export const PROJECT_SEEKING_HIRE_LABEL = "Looking to hire" as const;

export type ProjectSeekingFlags = {
  lookingForContributors?: boolean;
  lookingToHire?: boolean;
};

export function projectSeekingLabels(
  flags: ProjectSeekingFlags,
): string[] {
  const labels: string[] = [];
  if (flags.lookingForContributors) {
    labels.push(PROJECT_SEEKING_CONTRIBUTORS_LABEL);
  }
  if (flags.lookingToHire) {
    labels.push(PROJECT_SEEKING_HIRE_LABEL);
  }
  return labels;
}
