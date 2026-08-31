"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeftIcon } from "@/components/icons";

export default function NewProjectPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [repositoryUrl, setRepositoryUrl] = useState("");
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setServerError("");
    setLoading(true);

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          repositoryUrl,
          description: description || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.details) {
          const fieldErrors: Record<string, string> = {};
          for (const detail of data.details) {
            if (detail.field && detail.message) {
              fieldErrors[detail.field] = detail.message;
            }
          }
          setErrors(fieldErrors);
        } else {
          setServerError(data.error || "Failed to create project");
        }
        return;
      }

      router.push(`/projects/${data.id}`);
    } catch {
      setServerError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-body font-medium focus-ring"
        style={{ color: "var(--color-text-secondary)" }}
      >
        <ArrowLeftIcon className="h-4 w-4" />
        Back to Dashboard
      </Link>

      <h1 className="heading-page mt-6">New Project</h1>
      <p className="mt-1 text-body" style={{ color: "var(--color-text-secondary)" }}>
        Add a Solidity repository for security analysis.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        {/* Project Name */}
        <div>
          <label htmlFor="name" className="input-label">
            Project Name <span style={{ color: "var(--color-destructive)" }}>*</span>
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., DeFi Vault"
            className="input focus-ring"
            disabled={loading}
            required
            aria-describedby={errors.name ? "name-error" : undefined}
            aria-invalid={!!errors.name}
          />
          {errors.name && (
            <p id="name-error" className="input-error" role="alert">
              {errors.name}
            </p>
          )}
        </div>

        {/* Repository URL */}
        <div>
          <label htmlFor="repositoryUrl" className="input-label">
            GitHub Repository URL <span style={{ color: "var(--color-destructive)" }}>*</span>
          </label>
          <input
            id="repositoryUrl"
            type="url"
            value={repositoryUrl}
            onChange={(e) => setRepositoryUrl(e.target.value)}
            placeholder="https://github.com/org/repo"
            className="input focus-ring"
            disabled={loading}
            required
            aria-describedby={errors.repositoryUrl ? "url-error" : "url-help"}
            aria-invalid={!!errors.repositoryUrl}
          />
          {errors.repositoryUrl ? (
            <p id="url-error" className="input-error" role="alert">
              {errors.repositoryUrl}
            </p>
          ) : (
            <p id="url-help" className="input-description">
              Must be a public GitHub repository URL containing a Foundry project.
            </p>
          )}
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="input-label">
            Description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description of the project"
            rows={3}
            className="input focus-ring resize-y"
            disabled={loading}
            aria-describedby={errors.description ? "desc-error" : undefined}
            aria-invalid={!!errors.description}
          />
          {errors.description && (
            <p id="desc-error" className="input-error" role="alert">
              {errors.description}
            </p>
          )}
        </div>

        {/* Server Error */}
        {serverError && (
          <div
            className="rounded-lg border p-4 text-body"
            role="alert"
            style={{
              background: "var(--color-blocked-bg)",
              borderColor: "var(--color-blocked-border)",
              color: "var(--color-destructive)",
            }}
          >
            {serverError}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary focus-ring"
          >
            {loading ? (
              <span className="animate-pulse-subtle">Creating...</span>
            ) : (
              "Create Project"
            )}
          </button>
          <Link href="/dashboard" className="btn btn-secondary focus-ring">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
