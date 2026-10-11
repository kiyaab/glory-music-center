import { useEffect, useState } from "react";
import { toast } from "sonner";

type Props = { urls: string[] };

/**
 * Runtime check that verifies every provided image URL loads successfully.
 * On any failure, shows a clear on-screen warning banner and a toast so the
 * issue is obvious in production (e.g. when hosted on Vercel).
 */
export function ImageHealthCheck({ urls }: Props) {
  const [failed, setFailed] = useState<string[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const unique = Array.from(new Set(urls));
    let cancelled = false;
    const fails: string[] = [];

    Promise.all(
      unique.map(
        (url) =>
          new Promise<void>((resolve) => {
            const img = new Image();
            img.onload = () => resolve();
            img.onerror = () => {
              fails.push(url);
              resolve();
            };
            img.src = url;
          }),
      ),
    ).then(() => {
      if (cancelled) return;
      if (fails.length > 0) {
        setFailed(fails);
        toast.error(`${fails.length} image${fails.length === 1 ? "" : "s"} failed to load`, {
          description: fails[0] + (fails.length > 1 ? ` (+${fails.length - 1} more)` : ""),
          duration: 10000,
        });
        // eslint-disable-next-line no-console
        console.warn("[ImageHealthCheck] Failed to load images:", fails);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [urls]);

  if (failed.length === 0) return null;

  return (
    <div
      role="alert"
      className="fixed bottom-4 left-1/2 z-[100] w-[min(92vw,520px)] -translate-x-1/2 rounded-xl border border-destructive/60 bg-destructive/10 p-4 text-sm text-destructive backdrop-blur"
    >
      <p className="font-semibold">
        {failed.length} image{failed.length === 1 ? "" : "s"} failed to load
      </p>
      <ul className="mt-2 max-h-32 overflow-auto break-all text-xs opacity-90">
        {failed.map((u) => (
          <li key={u}>• {u}</li>
        ))}
      </ul>
    </div>
  );
}
