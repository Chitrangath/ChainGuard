import type { SubmoduleValidationResult } from "./types";

export interface GitmodulesEntry {
  name: string;
  url: string;
}

const MAX_SUBMODULES = 20;

const GITHUB_URL_RE = /^https:\/\/github\.com\/[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+(?:\.git)?$/;

function isRelativeUrl(url: string): boolean {
  return (
    url.startsWith("../") ||
    url.startsWith("./") ||
    (!url.startsWith("http://") &&
      !url.startsWith("https://") &&
      !url.startsWith("git://") &&
      !url.startsWith("file://") &&
      !url.startsWith("ssh://") &&
      !url.includes("@") &&
      !url.startsWith("/"))
  );
}

function resolveRelativeUrl(
  relativeUrl: string,
  parentRepoUrl: string,
): string {
  const parent = parentRepoUrl.replace(/\.git$/, "").replace(/\/$/, "");
  const parts = parent.split("/");

  let resultParts = [...parts];
  let remaining = relativeUrl;

  while (remaining.startsWith("../")) {
    if (resultParts.length > 3) {
      resultParts.pop();
    }
    remaining = remaining.slice(3);
  }

  if (remaining.startsWith("./")) {
    remaining = remaining.slice(2);
  }

  return `${resultParts.join("/")}/${remaining}`;
}

export function validateSubmoduleUrl(
  url: string,
  parentRepoUrl: string,
): { valid: boolean; resolvedUrl: string; reason?: string } {
  let resolvedUrl = url;

  if (isRelativeUrl(url)) {
    resolvedUrl = resolveRelativeUrl(url, parentRepoUrl);
  }

  if (resolvedUrl.startsWith("file://")) {
    return { valid: false, resolvedUrl, reason: "file:// URLs are not allowed" };
  }

  if (
    resolvedUrl.startsWith("git@") ||
    resolvedUrl.match(/^[a-zA-Z0-9]+@/)
  ) {
    return { valid: false, resolvedUrl, reason: "SSH URLs are not allowed" };
  }

  if (
    resolvedUrl.includes("://") &&
    resolvedUrl.match(/:\/\/[^:]+:[^@]+@/)
  ) {
    return { valid: false, resolvedUrl, reason: "URLs with credentials are not allowed" };
  }

  if (resolvedUrl.match(/^\/[a-zA-Z]/) || resolvedUrl.match(/^[A-Z]:\\/i)) {
    return { valid: false, resolvedUrl, reason: "Absolute local paths are not allowed" };
  }

  if (!GITHUB_URL_RE.test(resolvedUrl)) {
    return {
      valid: false,
      resolvedUrl,
      reason: "Submodule URL must resolve to a GitHub HTTPS URL (https://github.com/<owner>/<repo>)",
    };
  }

  if (isRelativeUrl(url)) {
    const parentOwner = parentRepoUrl.match(/github\.com\/([^/]+)/)?.[1];
    const resolvedOwner = resolvedUrl.match(/github\.com\/([^/]+)/)?.[1];
    if (parentOwner && resolvedOwner && parentOwner !== resolvedOwner) {
      return {
        valid: false,
        resolvedUrl,
        reason: `Submodule must resolve within the ${parentOwner} GitHub namespace`,
      };
    }
    if (parentOwner && !resolvedOwner) {
      return {
        valid: false,
        resolvedUrl,
        reason: `Relative URL resolves outside the ${parentOwner} GitHub namespace`,
      };
    }
  }

  return { valid: true, resolvedUrl };
}

export function validateAllSubmodules(
  entries: GitmodulesEntry[],
  parentRepoUrl: string,
): SubmoduleValidationResult {
  if (entries.length > MAX_SUBMODULES) {
    return {
      valid: false,
      urls: [],
      rejected: entries.map((e) => ({
        name: e.name,
        url: e.url,
        reason: `Too many submodules (limit: ${MAX_SUBMODULES})`,
      })),
      reason: `Too many submodules (limit: ${MAX_SUBMODULES})`,
    };
  }

  const urls: SubmoduleValidationResult["urls"] = [];
  const rejected: SubmoduleValidationResult["rejected"] = [];

  for (const entry of entries) {
    const result = validateSubmoduleUrl(entry.url, parentRepoUrl);
    if (result.valid) {
      urls.push({ name: entry.name, resolvedUrl: result.resolvedUrl, valid: true });
    } else {
      rejected.push({ name: entry.name, url: entry.url, reason: result.reason ?? "Invalid URL" });
    }
  }

  return {
    valid: rejected.length === 0,
    urls,
    rejected,
  };
}

export function parseGitmodules(content: string): GitmodulesEntry[] {
  const entries: GitmodulesEntry[] = [];
  const lines = content.split("\n");
  let current: GitmodulesEntry | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    const submoduleMatch = trimmed.match(/^\[submodule\s+"([^"]+)"\]$/);
    if (submoduleMatch) {
      if (current) entries.push(current);
      current = { name: submoduleMatch[1], url: "" };
      continue;
    }
    if (current) {
      const urlMatch = trimmed.match(/^url\s*=\s*(.+)$/);
      if (urlMatch) {
        current.url = urlMatch[1].trim();
      }
    }
  }
  if (current) entries.push(current);

  return entries;
}
