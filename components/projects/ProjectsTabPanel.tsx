"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { HACKATHON_FIELDS } from "@/lib/hackathonDirectory";
import { formatProjectTitle } from "@/lib/formatProjectTitle";
import { robotoMono } from "../../fonts";
import { AddProjectForm } from "./AddProjectForm";
import { projectSeekingLabels } from "../../shared/projectSeeking";
import { EditProjectForm } from "./EditProjectForm";
import { JoinProjectForm } from "./JoinProjectForm";
import { ProjectActionCards } from "./ProjectActionCards";
import { ProjectActions } from "./ProjectActions";
import { ProjectCard } from "./ProjectCard";
import { ProjectSectionHeaderActions } from "./ProjectSectionHeaderActions";
import { ProjectInvitesPanel } from "./ProjectInvitesPanel";
import { ProjectJoinRequestsPanel } from "./ProjectJoinRequestsPanel";
import { ProjectVideoModal } from "./ProjectVideoModal";

type ProjectsTabPanelProps = {
  builderName: string;
};

function formatMemberNames(
  members: { name: string; role: "owner" | "member" }[],
  fallbackName: string,
) {
  if (members.length === 0) return fallbackName;
  return members.map((member) => member.name).join(", ");
}

type MyProject = NonNullable<ReturnType<typeof useQuery<typeof api.projects.listMine>>>[number];

function EditProjectModal({
  project,
  onClose,
  onSaved,
}: {
  project: MyProject;
  onClose: () => void;
  onSaved: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-2xl rounded-[24px] bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Edit ${project.title}`}
      >
        <h3 className={`${robotoMono.className} mb-5 text-sm font-semibold uppercase tracking-wide text-neutral-500`}>
          Edit project
        </h3>
        <EditProjectForm
          variant="light"
          projectId={project._id}
          initialField={project.field}
          initialTitle={project.title}
          initialBlurb={project.blurb}
          initialLocation={project.location ?? ""}
          initialLiveUrl={project.liveUrl ?? ""}
          initialJoinCode={project.joinCode ?? ""}
          initialLookingForContributors={project.lookingForContributors === true}
          initialLookingToHire={project.lookingToHire === true}
          onCancel={onClose}
          onSaved={onSaved}
        />
      </div>
    </div>
  );
}

export function ProjectsTabPanel({ builderName }: ProjectsTabPanelProps) {
  const projects = useQuery(api.projects.listMine);
  const [isAdding, setIsAdding] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [editingProjectId, setEditingProjectId] = useState<Id<"projects"> | null>(null);

  const selectedProject = projects?.find((project) => project._id === selectedProjectId) ?? null;
  const editingProject = projects?.find((project) => project._id === editingProjectId) ?? null;

  if (projects === undefined) {
    return <p className={`${robotoMono.className} text-sm text-white/75`}>Loading projects…</p>;
  }

  if (isAdding) {
    return (
      <>
        <ProjectInvitesPanel />
        <ProjectJoinRequestsPanel />
        <AddProjectForm
          onCancel={() => setIsAdding(false)}
          onCreated={() => setIsAdding(false)}
        />
      </>
    );
  }

  return (
    <>
      <ProjectInvitesPanel />
      <ProjectJoinRequestsPanel />

      <div className="mb-6 flex justify-end">
        <ProjectSectionHeaderActions
          variant="events"
          onAddProject={() => setIsAdding(true)}
          onJoinWithCode={() => setIsJoining(true)}
        />
      </div>

      {projects.length === 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <ProjectActionCards
            onAddProject={() => setIsAdding(true)}
            onJoinWithCode={() => setIsJoining(true)}
            variant="events"
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <div key={project._id} className="flex h-full flex-col gap-3">
              <ProjectCard
                fieldLabel={HACKATHON_FIELDS[project.field]}
                title={project.title}
                builder={formatMemberNames(project.members, builderName)}
                blurb={project.blurb}
                seekingLabels={projectSeekingLabels(project)}
                onOpen={() => setSelectedProjectId(project._id)}
                showLinkPills={false}
                variant="dashboard"
              />
              <ProjectActions
                projectId={project._id}
                projectTitle={project.title}
                viewerRole={project.viewerRole}
                hasPendingJoinRequest={project.hasPendingJoinRequest}
                variant="dashboard"
                trigger="minimal"
                menuVariant="panel"
                onEdit={() => setEditingProjectId(project._id)}
              />
            </div>
          ))}
        </div>
      )}

      {isJoining ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setIsJoining(false)}
          role="presentation"
        >
          <div
            className="w-full max-w-lg rounded-[24px] bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Join project with code"
          >
            <h3 className={`${robotoMono.className} mb-5 text-sm font-semibold uppercase tracking-wide text-neutral-500`}>
              Join with code
            </h3>
            <JoinProjectForm
              variant="light"
              onCancel={() => setIsJoining(false)}
              onJoined={() => setIsJoining(false)}
            />
          </div>
        </div>
      ) : null}

      <ProjectVideoModal
        project={
          selectedProject
            ? {
                field: selectedProject.field,
                title: selectedProject.title,
                builder: formatMemberNames(selectedProject.members, builderName),
                blurb: selectedProject.blurb,
              }
            : null
        }
        onClose={() => setSelectedProjectId(null)}
        formatTitle={formatProjectTitle}
      />

      {editingProject ? (
        <EditProjectModal
          project={editingProject}
          onClose={() => setEditingProjectId(null)}
          onSaved={() => setEditingProjectId(null)}
        />
      ) : null}
    </>
  );
}
