import { Code2 } from "lucide-react";

export function SiteFooter() {
  const contract = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
  const explorerBase = process.env.NEXT_PUBLIC_BLOCK_EXPLORER_BASE_URL;
  const contractUrl = contract && explorerBase ? `${explorerBase.replace(/\/$/, "")}/address/${contract}` : null;

  return (
    <footer className="border-t border-white/10 px-6 py-8 text-xs text-[var(--ll-text-secondary)]">
      <div className="mx-auto flex max-w-4xl flex-col items-center justify-between gap-3 sm:flex-row">
        <div>LikenessLock — consent you can verify, on Monad.</div>
        <div className="flex items-center gap-4">
          {contractUrl && contract && (
            <a
              href={contractUrl}
              target="_blank"
              rel="noreferrer"
              className="font-mono hover:text-[var(--ll-text-primary)]"
            >
              {contract.slice(0, 8)}...{contract.slice(-6)}
            </a>
          )}
          <a
            href="https://github.com/manohar2509/monad-hackathon"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 hover:text-[var(--ll-text-primary)]"
          >
            <Code2 size={14} />
            GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}
