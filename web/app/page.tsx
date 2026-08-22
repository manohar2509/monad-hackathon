import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { ConsentPassport } from "@/components/consent-passport";

export default function LandingPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-12 px-6 py-16">
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
    </main>
  );
}
