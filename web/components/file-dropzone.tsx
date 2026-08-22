"use client";

import { useCallback, useState } from "react";
import { UploadCloud, FileCheck2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function FileDropzone({
  onFile,
  fileName,
}: {
  onFile: (file: File) => void;
  fileName?: string;
}) {
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLLabelElement>) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file) onFile(file);
    },
    [onFile],
  );

  return (
    <label
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-[16px] border-2 border-dashed px-6 py-12 text-center cursor-pointer transition-colors",
        dragOver ? "border-[var(--ll-primary)] bg-[var(--ll-primary)]/5" : "border-white/15",
        fileName && "border-[var(--ll-verified)]/50",
      )}
    >
      <input
        type="file"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
        }}
      />
      {fileName ? (
        <FileCheck2 className="text-[var(--ll-verified)]" size={32} />
      ) : (
        <UploadCloud className="text-[var(--ll-text-secondary)]" size={32} />
      )}
      <div className="text-sm text-[var(--ll-text-primary)]">
        {fileName ?? "Drag and drop a file, or click to browse"}
      </div>
      {!fileName && (
        <div className="text-xs text-[var(--ll-text-secondary)]">
          Hashed locally with SHA-256 — the file never leaves your browser.
        </div>
      )}
    </label>
  );
}
