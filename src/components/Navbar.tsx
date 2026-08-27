"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldIcon } from "./icons";

export function Navbar() {
  const pathname = usePathname();

  const isDashboardActive =
    pathname === "/dashboard" || pathname.startsWith("/projects");

  return (
    <nav
      style={{
        background: "var(--surface-nav)",
        borderBottom: "1px solid var(--border-default)",
      }}
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link
          href="/"
          className="flex items-center gap-2 text-lg font-bold tracking-tight focus-ring"
          style={{ color: "var(--text-primary)" }}
        >
          <ShieldIcon className="h-6 w-6" />
          <span>ChainGuard</span>
        </Link>
        <div className="flex items-center gap-1">
          <Link
            href="/dashboard"
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-ring ${
              isDashboardActive
                ? "text-primary"
                : "text-secondary hover:text-primary"
            }`}
            style={{
              color: isDashboardActive
                ? "var(--text-primary)"
                : "var(--text-secondary)",
              background: isDashboardActive
                ? "var(--color-action-secondary)"
                : "transparent",
            }}
            aria-current={isDashboardActive ? "page" : undefined}
          >
            Dashboard
          </Link>
        </div>
      </div>
    </nav>
  );
}
