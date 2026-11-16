"use client";

import { useMemo } from "react";
import { useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { api } from "../../convex/_generated/api";
import { HACKATHON_FIELDS } from "@/lib/hackathonDirectory";
import { projectSeekingLabels } from "../../shared/projectSeeking";
import { robotoFlex, robotoMono } from "../../fonts";
import { ProjectActions } from "./ProjectActions";
import { ProjectCard } from "./ProjectCard";

function formatMemberNames(members: { name: string }[]) {
  if (members.length === 0) return "Community project";
  return members.map((member) => member.name).join(", ");
}

export function CommunityProjectsSection() {
  const { isSignedIn } = useUser();
  const projects = useQuery(api.projects.listDiscoverable);

  const joinableProjects = useMemo(() => {
    if (!projects) return [];
    return projects.filter((project) => project.viewerRole === null);
  }, [projects]);

  if (!isSignedIn || !projects || joinableProjects.length === 0) {
    return null;
  }

  return (
    <section className="mt-14" aria-labelledby="community-projects-heading">
      <h2
        id="community-projects-heading"
        className={`${robotoFlex.className} text-xl font-semibold tracking-[-0.02em] text-white sm:text-2xl`}
      >
        Community projects
      </h2>
      <p className={`${robotoFlex.className} mt-2 text-sm text-white/80 sm:text-base`}>
        Projects from other builders you can request to join.
      </p>

      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {joinableProjects.map((project) => (
          <div key={project._id} className="flex h-full flex-col gap-3">
            <ProjectCard
              fieldLabel={HACKATHON_FIELDS[project.field]}
              title={project.title}
              builder={formatMemberNames(project.members)}
              blurb={project.blurb}
              seekingLabels={projectSeekingLabels(project)}
              onOpen={() => {}}
              showLinkPills={false}
              showHackathonBranding={false}
              variant="portal"
              interactive={false}
            />
            <ProjectActions
              projectId={project._id}
              projectTitle={project.title}
              viewerRole={project.viewerRole}
              hasPendingJoinRequest={project.hasPendingJoinRequest}
              variant="portal"
            />
          </div>
        ))}
      </div>
    </section>
  );
}
