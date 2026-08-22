import Link from "next/link";
import { ShieldCheck, Fingerprint, Zap, Eye } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { ConsentPassport } from "@/components/consent-passport";
import { FadeIn } from "@/components/fade-in";

const monadPoints = [
  {
    icon: Fingerprint,
    title: "Native P256 precompile",
    body: "Monad exposes secp256r1 verification at 0x0100 (EIP-7951) — the same curve WebAuthn passkeys use. Consent is verified with a real biometric signature, checked directly on-chain, without an expensive wrapper contract.",
  },
  {
    icon: Zap,
    title: "~400ms blocks",
    body: "Grant, revoke, and verify all confirm in roughly one block. Consent state changes feel instant, not like a typical multi-second chain confirmation.",
  },
  {
    icon: Eye,
    title: "Public, no shared database",
    body: "Anyone — a platform, a brand, a court — reads the same on-chain state directly. No API key, no trusting our servers, no separate database to keep in sync.",
  },
];

export default function LandingPage() {
  return (
    <main className="flex flex-1 flex-col items-center gap-20 px-6 py-16">
      <div className="flex flex-1 flex-col items-center justify-center gap-12">
        <div className="flex max-w-xl flex-col items-center gap-6 text-center">
          <span className="flex items-center gap-1.5 rounded-[999px] bg-[var(--ll-primary)]/15 px-3 py-1 text-xs font-semibold tracking-wide text-[var(--ll-primary-soft)]">
            <ShieldCheck size={14} />
            Built on Monad
          </span>

          <h1 className="text-4xl font-semibold leading-tight text-[var(--ll-text-primary)] sm:text-5xl">
            AI media should prove the people in it said yes.
          </h1>

          <p className="max-w-md text-base text-[var(--ll-text-secondary)]">
            Bind consent to the exact asset, purpose and expiry with a passkey verified on
            Monad.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/create" className={buttonVariants({ size: "lg", className: "rounded-[10px]" })}>
              Create Consent Passport
            </Link>
            <Link
              href="/verify"
              className={buttonVariants({ size: "lg", variant: "outline", className: "rounded-[10px]" })}
            >
              Verify an Asset
            </Link>
          </div>
        </div>

        <FadeIn>
          <ConsentPassport
            title="AI Campaign #0042"
            fingerprint="8a24...e19c"
            subjects={[
              { displayName: "Alice", status: "active" },
              { displayName: "Bob", status: "active" },
            ]}
            purpose="Commercial AI advertisement"
            validUntil="23 Aug 2026"
            status="valid"
            activeCount={2}
            requiredCount={2}
          />
        </FadeIn>
      </div>

      <section className="w-full max-w-4xl">
        <h2 className="text-center text-sm font-semibold tracking-[0.2em] text-[var(--ll-text-secondary)]">
          WHY MONAD
        </h2>
        <div className="mt-8 grid gap-6 sm:grid-cols-3">
          {monadPoints.map((point) => (
            <div
              key={point.title}
              className="flex flex-col gap-3 rounded-[16px] border border-white/10 bg-[var(--ll-surface)] p-6"
            >
              <point.icon className="text-[var(--ll-primary-soft)]" size={22} />
              <h3 className="text-base font-medium text-[var(--ll-text-primary)]">{point.title}</h3>
              <p className="text-sm text-[var(--ll-text-secondary)]">{point.body}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
