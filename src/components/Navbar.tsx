"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldIcon, PlusIcon } from "./icons";

export function Navbar() {
  const pathname = usePathname();
  const isLanding = pathname === "/";

  return (
    <header
      style={{
        background: "var(--color-surface-nav)",
        borderBottom: "1px solid var(--color-border)",
      }}
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link
            className="flex items-center gap-2 text-sm font-bold tracking-tight focus-ring"
            style={{ color: "var(--color-text)" }}
            href="/"
          >
            <ShieldIcon className="h-5 w-5" style={{ color: "var(--color-primary)" }} />
            <span>ChainGuard</span>
          </Link>
          {!isLanding && (
            <span
              className="hidden text-xs sm:inline"
              style={{ color: "var(--color-text-muted)" }}
            >
              Smart Contract DevSecOps
            </span>
          )}
        </div>
        <nav className="flex items-center gap-1" aria-label="Main navigation">
          {!isLanding && (
            <Link
              className="rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-ring"
              style={{
                color: pathname === "/dashboard" ? "var(--color-primary)" : "var(--color-text-secondary)",
                background: pathname === "/dashboard" ? "var(--color-primary-muted)" : "transparent",
              }}
              href="/dashboard"
            >
              Dashboard
            </Link>
          )}
          {isLanding && (
            <>
              <Link
                className="rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-ring"
                style={{ color: "var(--color-text-secondary)" }}
                href="/dashboard"
              >
                Dashboard
              </Link>
              <Link
                className="btn btn-primary btn-sm focus-ring"
                href="/projects/new"
              >
                <PlusIcon className="h-4 w-4" />
                <span className="hidden sm:inline">New Project</span>
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
