"use client";

// Mentors publish a new project. Learners who open this page are pointed back to Projects.
import Link from "next/link";
import { useRouter } from "next/navigation";
import ProjectForm, { emptyProjectForm } from "@/components/ProjectForm";
import { useToast } from "@/components/Toast";
import { useUser } from "@/components/UserProvider";
import { createProject } from "@/lib/db";
import { useT } from "@/components/LocaleProvider";

export default function NewProjectPage() {
  const t = useT();
  const router = useRouter();
  const toast = useToast();
  const { currentUser, isMentor } = useUser();

  if (!currentUser) return <p className="muted">{t("Loading…")}</p>;
  if (!isMentor) {
    return (
      <div className="card">
        <h1>{t("New project")}</h1>
        <p className="muted">{t("Only mentors can publish projects. Switch to a mentor in the header to try it.")}</p>
        <Link href="/projects" className="btn btn-secondary">
          {t("Browse projects")}
        </Link>
      </div>
    );
  }

  async function handleSubmit(form) {
    const project = await createProject(currentUser, form);
    toast(t("Project published. Learners can join it now."));
    router.push(`/projects/${project.id}`);
  }

  return (
    <div style={{ maxWidth: 820 }}>
      <Link href="/" className="back">
        {t("← Home")}
      </Link>
      <h1>{t("New project")}</h1>
      <p className="muted">
        {t(
          "Turn a realistic situation from your work into a team project. You set the standard; AI uses it to give every team feedback, so you only step in where it matters."
        )}
      </p>
      <ProjectForm initial={emptyProjectForm()} submitLabel={t("Publish project")} onSubmit={handleSubmit} />
    </div>
  );
}
