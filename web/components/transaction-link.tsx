import { explorerTxUrl } from "@/lib/monad";
import { ExternalLink } from "lucide-react";

export function TransactionLink({
  txHash,
  blockNumber,
}: {
  txHash: string;
  blockNumber?: string;
}) {
  const url = explorerTxUrl(txHash);
  const short = `${txHash.slice(0, 10)}...${txHash.slice(-8)}`;

  return (
    <div className="flex flex-col gap-1 rounded-[10px] border border-white/10 bg-[var(--ll-surface-raised)] px-3 py-2 text-xs font-mono text-[var(--ll-text-secondary)]">
      <div className="flex items-center gap-1.5">
        <span className="text-[var(--ll-text-primary)]">tx</span>
        {url ? (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-[var(--ll-primary-soft)] hover:underline"
          >
            {short}
            <ExternalLink size={12} />
          </a>
        ) : (
          <span>{short}</span>
        )}
      </div>
      {blockNumber && (
        <div>
          <span className="text-[var(--ll-text-primary)]">block</span> #{blockNumber}
        </div>
      )}
    </div>
  );
}
