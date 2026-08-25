import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-24">
      <div className="max-w-2xl text-center">
        <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-5xl">
          ChainGuard
        </h1>
        <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400">
          Smart Contract DevSecOps
        </p>
        <p className="mt-2 text-zinc-500 dark:text-zinc-500">
          Analyze Solidity projects. Detect security issues. Evaluate deployment
          readiness.
        </p>
        <div className="mt-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center rounded-lg bg-zinc-900 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            Open Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
