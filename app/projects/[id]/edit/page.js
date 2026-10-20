"use client";

// The project's mentor edits the brief, criteria and tasks.
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import ProjectForm, { projectToForm } from "@/components/ProjectForm";
import { useToast } from "@/components/Toast";
import { useUser } from "@/components/UserProvider";
import { getProject, getTeamsForProject, updateProject } from "@/lib/db";

export default function EditProjectPage() {
  const { id } = useParams();
  const router = useRouter();
  const toast = useToast();
  const { currentUser } = useUser();
  const [project, setProject] = useState(undefined);
  const [teamCount, setTeamCount] = useState(0);

  useEffect(() => {
    getProject(id).then(setProject);
    getTeamsForProject(id).then((teams) => setTeamCount(teams.length));
  }, [id]);

  if (project === undefined || !currentUser) return <p className="muted">Loading…</p>;
  if (project === null) return <p>Project not found.</p>;
  if (project.mentorId !== currentUser.id) {
    return <p className="card muted">Only the mentor who wrote this project can edit it.</p>;
  }

  async function handleSubmit(form) {
    await updateProject(id, form);
    toast("Project updated");
    router.push(`/projects/${id}`);
  }

  return (
    <div style={{ maxWidth: 820 }}>
      <Link href={`/projects/${id}`} className="back">
        ← Back to project
      </Link>
      <h1>Edit project</h1>
      <ProjectForm
        initial={projectToForm(project)}
        submitLabel="Save changes"
        onSubmit={handleSubmit}
        hasTeams={teamCount > 0}
      />
    </div>
  );
}
