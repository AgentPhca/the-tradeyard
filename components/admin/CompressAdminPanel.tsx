"use client";

import { useState } from "react";

const BATCH_SIZE = 10;

interface BatchTotals {
  processed: number;
  skippedSmall: number;
  skippedNotSmaller: number;
  failed: number;
  bytesSaved: number;
}

interface FailedItem {
  bucket: string;
  path: string;
  error: string;
}

interface BatchResponse {
  offset: number;
  nextOffset: number;
  total: number;
  done: boolean;
  dryRun: boolean;
  batch: BatchTotals;
  items: {
    bucket: string;
    path: string;
    status: "uploaded" | "would_upload" | "skipped_small" | "skipped_not_smaller" | "failed";
    error?: string;
  }[];
}

const EMPTY_TOTALS: BatchTotals = {
  processed: 0,
  skippedSmall: 0,
  skippedNotSmaller: 0,
  failed: 0,
  bytesSaved: 0,
};

function formatMB(bytes: number): string {
  return (bytes / 1024 / 1024).toFixed(1);
}

export function CompressAdminPanel() {
  const [running, setRunning] = useState(false);
  const [runLabel, setRunLabel] = useState<"Testlauf" | "Komprimieren" | null>(null);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState<number | null>(null);
  const [totals, setTotals] = useState<BatchTotals>(EMPTY_TOTALS);
  const [failedItems, setFailedItems] = useState<FailedItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [compressionDone, setCompressionDone] = useState(false);

  const [bucketLimitsRunning, setBucketLimitsRunning] = useState(false);
  const [bucketLimitsResult, setBucketLimitsResult] = useState<string | null>(null);

  async function runLoop(dryRun: boolean) {
    setRunning(true);
    setRunLabel(dryRun ? "Testlauf" : "Komprimieren");
    setError(null);
    setOffset(0);
    setTotal(null);
    setTotals(EMPTY_TOTALS);
    setFailedItems([]);

    let currentOffset = 0;
    let done = false;
    const acc: BatchTotals = { ...EMPTY_TOTALS };
    const failures: FailedItem[] = [];

    try {
      while (!done) {
        const res = await fetch("/api/admin/compress", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ offset: currentOffset, batchSize: BATCH_SIZE, dryRun }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? `Server antwortete mit ${res.status}`);
        }

        const data: BatchResponse = await res.json();

        acc.processed += data.batch.processed;
        acc.skippedSmall += data.batch.skippedSmall;
        acc.skippedNotSmaller += data.batch.skippedNotSmaller;
        acc.failed += data.batch.failed;
        acc.bytesSaved += data.batch.bytesSaved;

        for (const item of data.items) {
          if (item.status === "failed") {
            failures.push({ bucket: item.bucket, path: item.path, error: item.error ?? "Unbekannter Fehler" });
          }
        }

        setTotal(data.total);
        setOffset(data.nextOffset);
        setTotals({ ...acc });
        setFailedItems([...failures]);

        currentOffset = data.nextOffset;
        done = data.done || data.total === 0;
      }

      if (!dryRun) setCompressionDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler beim Komprimieren.");
    } finally {
      setRunning(false);
    }
  }

  async function setBucketLimits() {
    setBucketLimitsRunning(true);
    setBucketLimitsResult(null);
    try {
      const res = await fetch("/api/admin/bucket-limits", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        const failedBuckets = (data.results ?? [])
          .filter((r: { ok: boolean }) => !r.ok)
          .map((r: { bucket: string; error?: string }) => `${r.bucket}: ${r.error}`)
          .join(", ");
        throw new Error(failedBuckets || data.error || "Unbekannter Fehler");
      }
      setBucketLimitsResult(
        `Erfolgreich gesetzt für: ${data.results.map((r: { bucket: string }) => r.bucket).join(", ")}`
      );
    } catch (err) {
      setBucketLimitsResult(
        `Fehler: ${err instanceof Error ? err.message : "Unbekannter Fehler."}`
      );
    } finally {
      setBucketLimitsRunning(false);
    }
  }

  return (
    <div className="mt-6 flex flex-col gap-6">
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          className="btn-secondary"
          disabled={running}
          onClick={() => runLoop(true)}
        >
          {running && runLabel === "Testlauf" ? "Testlauf läuft..." : "Testlauf (ändert nichts)"}
        </button>
        <button
          type="button"
          className="btn-primary"
          disabled={running}
          onClick={() => runLoop(false)}
        >
          {running && runLabel === "Komprimieren" ? "Komprimiert..." : "Komprimieren"}
        </button>
        <button
          type="button"
          className="btn-secondary"
          disabled={running || bucketLimitsRunning || !compressionDone}
          title={
            compressionDone
              ? undefined
              : "Erst verfügbar, nachdem ein echter Komprimieren-Lauf abgeschlossen wurde"
          }
          onClick={setBucketLimits}
        >
          {bucketLimitsRunning ? "Setze Limits..." : "Bucket-Limits setzen"}
        </button>
      </div>

      {(running || total !== null) && (
        <div className="rounded-md border border-border bg-surface p-4">
          <p className="text-sm font-medium text-text">
            {total === null
              ? "Lade..."
              : `${offset} / ${total} verarbeitet${running ? "..." : " — fertig"}`}
          </p>
          {total !== null && total > 0 && (
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-background">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${Math.min(100, (offset / total) * 100)}%` }}
              />
            </div>
          )}
          <dl className="mt-3 grid grid-cols-2 gap-2 text-sm text-muted sm:grid-cols-4">
            <div>
              <dt className="text-xs">Komprimiert</dt>
              <dd className="text-text">{totals.processed}</dd>
            </div>
            <div>
              <dt className="text-xs">Schon klein</dt>
              <dd className="text-text">{totals.skippedSmall}</dd>
            </div>
            <div>
              <dt className="text-xs">Nicht kleiner</dt>
              <dd className="text-text">{totals.skippedNotSmaller}</dd>
            </div>
            <div>
              <dt className="text-xs">Fehler</dt>
              <dd className="text-text">{totals.failed}</dd>
            </div>
          </dl>
          <p className="mt-2 text-sm text-text">
            Gespart: <span className="font-semibold">{formatMB(totals.bytesSaved)} MB</span>
          </p>
        </div>
      )}

      {failedItems.length > 0 && (
        <div className="rounded-md border border-red-400/40 bg-red-400/5 p-4">
          <p className="text-sm font-medium text-red-400">Fehlgeschlagene Bilder ({failedItems.length})</p>
          <ul className="mt-2 max-h-48 overflow-y-auto text-xs text-muted">
            {failedItems.map((f, i) => (
              <li key={i} className="truncate" title={`${f.bucket}/${f.path}: ${f.error}`}>
                {f.bucket}/{f.path}: {f.error}
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}

      {bucketLimitsResult && <p className="text-sm text-text">{bucketLimitsResult}</p>}
    </div>
  );
}
