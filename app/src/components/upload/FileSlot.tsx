import { useCallback, useState } from "react";

interface FileSlotProps {
  label: string;
  hint: string;
  accept: string;
  required?: boolean;
  file: File | null;
  onFile: (file: File | null) => void;
}

/** Extracts the lowercased extension list from an `accept` string like ".csv,.xlsx,.xls,.tsv". */
function extensionsFromAccept(accept: string): string[] {
  return accept
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.startsWith("."));
}

function hasAllowedExtension(fileName: string, accept: string): boolean {
  const lower = fileName.toLowerCase();
  return extensionsFromAccept(accept).some((ext) => lower.endsWith(ext));
}

/**
 * One labeled upload slot (e.g. "Met Data", "CO2 Emission Sources").
 * Both upload modules (ANN, gas dispersion) are built from these -
 * ANN uses one, dispersion uses two (met + one gas).
 *
 * `accept` drives the native file-picker filter AND is enforced here on
 * both click-to-browse and drag-and-drop, since the HTML `accept`
 * attribute only filters the picker dialog - it does nothing for a
 * dropped file, and nothing server-side. This is still just a client-side
 * nicety for a fast "wrong file" message; the server does its own
 * extension check, and real validation happens when the analysis-service
 * actually tries to parse the file (see server/API_CONTRACT.md).
 */
export function FileSlot({ label, hint, accept, required, file, onFile }: FileSlotProps) {
  const [dragOver, setDragOver] = useState(false);
  const [rejection, setRejection] = useState<string | null>(null);

  const tryAccept = useCallback(
    (candidate: File | null) => {
      if (!candidate) {
        onFile(null);
        setRejection(null);
        return;
      }
      if (!hasAllowedExtension(candidate.name, accept)) {
        setRejection(`"${candidate.name}" isn't a supported format (${accept}).`);
        return;
      }
      setRejection(null);
      onFile(candidate);
    },
    [accept, onFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const dropped = e.dataTransfer.files?.[0] ?? null;
      tryAccept(dropped);
    },
    [tryAccept]
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-xs font-medium text-[var(--color-text-secondary)]">{label}</label>
        {required && <span className="text-xs text-[var(--color-text-quaternary)]">Required</span>}
      </div>

      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors ${
          dragOver
            ? "border-[var(--color-primary)] bg-[var(--color-primary-subtle)]"
            : file
            ? "border-[var(--color-primary)]/40 bg-[var(--color-primary-subtle)]"
            : rejection
            ? "border-[var(--color-danger)]/50 bg-[var(--color-danger)]/5"
            : "border-dashed border-[var(--color-border)] hover:border-[var(--color-primary)]"
        }`}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0 text-[var(--color-text-tertiary)]">
          <path d="M8 10.5V2M8 2L5 5M8 2l3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M2.5 10.5v2a1 1 0 001 1h9a1 1 0 001-1v-2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
        <div className="flex-1 min-w-0">
          {file ? (
            <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">{file.name}</p>
          ) : rejection ? (
            <p className="text-sm text-[var(--color-danger)] truncate">{rejection}</p>
          ) : (
            <p className="text-sm text-[var(--color-text-quaternary)]">Drop file or click to browse</p>
          )}
          <p className="text-xs text-[var(--color-text-quaternary)]">{hint}</p>
        </div>
        {file && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              tryAccept(null);
            }}
            className="text-xs text-[var(--color-danger)] hover:underline shrink-0"
          >
            Remove
          </button>
        )}
        <input
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => tryAccept(e.target.files?.[0] ?? null)}
        />
      </label>
    </div>
  );
}
