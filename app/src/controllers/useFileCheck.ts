import { useEffect, useState } from "react";
import type { FileCheck } from "@/lib/checkDataFile";

/** Runs an async checker whenever the file (or checker inputs) change. */
export function useFileCheck(file: File | null, run: (f: File) => Promise<FileCheck | null>, deps: unknown[] = []) {
  const [check, setCheck] = useState<FileCheck | null>(null);
  useEffect(() => {
    let cancelled = false;
    setCheck(null);
    if (!file) return;
    run(file)
      .then((c) => !cancelled && setCheck(c))
      .catch(() => !cancelled && setCheck(null));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file, ...deps]);
  return check;
}
