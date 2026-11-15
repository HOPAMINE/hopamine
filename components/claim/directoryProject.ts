import type { HackathonProject } from "@/lib/hackathonDirectory";

export type DirectoryProject = {
  hackathonIndex: number;
  field: HackathonProject["field"];
  title: string;
  builder: string;
  discord?: string;
  blurb: string;
  liveUrl?: string;
  demoUrl?: string;
  repoUrl?: string;
};

export function toHackathonProject(project: DirectoryProject): HackathonProject {
  return {
    field: project.field,
    title: project.title,
    builder: project.builder,
    discord: project.discord,
    blurb: project.blurb,
    liveUrl: project.liveUrl,
    demoUrl: project.demoUrl,
    repoUrl: project.repoUrl,
  };
}
