"use client";

import { useEffect } from "react";
import { AddProjectForm } from "../../../components/projects/AddProjectForm";
import { jetbrainsMono, newsreader } from "../../../fonts";

type ZimaAddProjectModalProps = {
  onClose: () => void;
};

export function ZimaAddProjectModal({ onClose }: ZimaAddProjectModalProps) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        aria-label="Close add project"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="zima-add-project-title"
        className="relative z-10 max-h-[min(90dvh,720px)] w-full max-w-lg overflow-y-auto rounded-2xl border border-neutral-200 bg-white p-6 shadow-xl"
      >
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h2
              id="zima-add-project-title"
              className={`${newsreader.className} text-[28px] font-normal leading-tight tracking-[-0.02em] text-neutral-900`}
            >
              Add project
            </h2>
            <p
              className={`${jetbrainsMono.className} mt-1 text-[12px] text-neutral-500`}
            >
              Create a project and it shows on your profile.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`${jetbrainsMono.className} rounded-lg px-2 py-1 text-[12px] font-semibold uppercase tracking-wide text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-800`}
          >
            Close
          </button>
        </div>
        <AddProjectForm
          variant="light"
          onCancel={onClose}
          onCreated={onClose}
        />
      </div>
    </div>
  );
}
