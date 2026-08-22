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
      <nav className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
        <Link
          href="/"
          className="text-sm font-semibold tracking-[0.2em] text-[var(--ll-text-primary)]"
        >
          LIKENESSLOCK
        </Link>

        <div className="flex items-center gap-6">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-[var(--ll-text-secondary)] transition-colors hover:text-[var(--ll-text-primary)]"
            >
              {link.label}
            </Link>
          ))}
          <span className="flex items-center gap-1.5 rounded-[999px] bg-[var(--ll-primary)]/15 px-3 py-1 text-xs font-semibold tracking-wide text-[var(--ll-primary-soft)]">
            <ShieldCheck size={12} />
            Monad
          </span>
        </div>
      </nav>
    </header>
  );
}
