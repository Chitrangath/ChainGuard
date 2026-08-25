import { z } from "zod";

const GITHUB_URL_PATTERN = /^https:\/\/github\.com\/[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+(?:\/.*)?$/;

export const createProjectSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be 100 characters or fewer"),
  repositoryUrl: z
    .string()
    .min(1, "Repository URL is required")
    .url("Repository URL must be a valid URL")
    .regex(GITHUB_URL_PATTERN, "Repository URL must be a valid HTTPS GitHub repository URL (https://github.com/owner/repo)"),
  description: z.string().max(500, "Description must be 500 characters or fewer").optional(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
