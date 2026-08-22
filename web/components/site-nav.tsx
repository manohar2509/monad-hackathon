import Link from "next/link";
import { ShieldCheck } from "lucide-react";

const links = [
  { href: "/identity", label: "Register" },
  { href: "/create", label: "Create" },
  { href: "/verify", label: "Verify" },
];

export function SiteNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[var(--ll-surface)]/80 backdrop-blur">
      <nav className="mx-auto flex max-w-4xl items-center justify-between gap-2 px-4 py-4 sm:px-6">
        <Link
          href="/"
          className="shrink-0 text-xs font-semibold tracking-[0.1em] text-[var(--ll-text-primary)] sm:text-sm sm:tracking-[0.2em]"
        >
          LIKENESSLOCK
        </Link>

        <div className="flex items-center gap-3 sm:gap-6">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-xs text-[var(--ll-text-secondary)] transition-colors hover:text-[var(--ll-text-primary)] sm:text-sm"
            >
              {link.label}
            </Link>
          ))}
          <span className="hidden shrink-0 items-center gap-1.5 rounded-[999px] bg-[var(--ll-primary)]/15 px-3 py-1 text-xs font-semibold tracking-wide text-[var(--ll-primary-soft)] sm:flex">
            <ShieldCheck size={12} />
            Monad
          </span>
        </div>
      </nav>
    </header>
  );
}
