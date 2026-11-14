import Image from "next/image";
import { LoaderCircle, Sparkles } from "lucide-react";
import { PhotoComparisonRunner } from "@/components/photo-comparison-runner";
import { cn } from "@/lib/cn";
import {
  ADVISORY_NOTE,
  comparisonHeadline,
  comparisonState,
  findingCount,
  missingPartLine,
  parseStoredComparison,
  type DoneComparison,
} from "@/lib/photo-comparison";

/** A finished comparison stored on a check, or null if there isn't one (never ran, still running, failed). */
export function doneComparison(value: unknown): DoneComparison | null {
  const stored = parseStoredComparison(value);
  return stored?.status === "done" ? stored : null;
}

/**
 * What the AI noticed between two sets of handover photos. Worded as suggestions
 * for the owner and the renter, who both see exactly the same thing.
 */
export function ComparisonPanel({ comparison, whose, className }: { comparison: DoneComparison; whose?: string; className?: string }) {
  const isReturn = comparison.stage === "RETURN";
  const title = isReturn ? "Compared with pickup" : "Checked against the listing";
  const same = isReturn && comparison.comparable && findingCount(comparison) === 0;
  return (
    <div className={cn("rounded-xl border border-line bg-surface p-3", className)} data-testid="photo-comparison">
      <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted uppercase">
        <Sparkles className="size-3.5 text-accent-ink" aria-hidden /> {title}
        {whose && <span className="font-normal normal-case">· {whose} photos</span>}
      </p>
      <p className="mt-1.5 text-sm font-semibold">{comparisonHeadline(comparison)}</p>

      {isReturn && comparison.comparable && findingCount(comparison) > 0 && (
        <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm text-ink-2">
          {comparison.missingParts.map((part) => (
            <li key={`missing-${part}`}>{missingPartLine(part)}</li>
          ))}
          {comparison.differences.map((d, i) => (
            <li key={`${d.description}-${i}`}>
              {d.description}
              {d.photoIndex !== null && comparison.photos.length > 1 && <span className="text-muted"> (photo {d.photoIndex})</span>}
              {d.confidence === "low" && <span className="text-muted"> · hard to tell</span>}
            </li>
          ))}
        </ul>
      )}

      {!comparison.comparable && (
        <p className="mt-1 text-sm text-ink-2">
          {isReturn
            ? "The photos are too dark, blurred or taken from too different an angle. Retaking them from the same angle as the pickup photos would help."
            : "The photos are too dark, blurred or framed too differently from the listing to tell."}
        </p>
      )}
      {!isReturn && comparison.comparable && comparison.note && <p className="mt-1 text-sm text-ink-2">{comparison.note}</p>}

      {same && comparison.referencePhotos[0] && comparison.photos[0] && (
        <div className="mt-2 grid max-w-xs grid-cols-2 gap-2">
          {(
            [
              ["At pickup", comparison.referencePhotos[0]],
              ["At return", comparison.photos[0]],
            ] as const
          ).map(([label, src]) => (
            <a key={label} href={src} target="_blank" rel="noreferrer" className="relative aspect-square overflow-hidden rounded-lg bg-paper">
              <Image src={src} alt={`${label} photo`} fill sizes="150px" className="object-cover" />
              <span className="absolute bottom-1 left-1 rounded bg-ink/70 px-1.5 text-[0.65rem] text-white">{label}</span>
            </a>
          ))}
        </div>
      )}

      <p className="mt-2 text-xs leading-relaxed text-muted">{ADVISORY_NOTE}</p>
    </div>
  );
}

/**
 * The comparison slot under one check's photos: the result if there is one,
 * otherwise (when AI is switched on) it starts or waits for the comparison.
 * With no AI key it renders nothing, so the page looks as it did before.
 */
export function CheckComparison({ check, aiOn, now }: { check: { id: string; stage: "PICKUP" | "RETURN"; aiComparison: unknown }; aiOn: boolean; now: number }) {
  const stored = parseStoredComparison(check.aiComparison);
  if (stored?.status === "done") return <ComparisonPanel comparison={stored} className="mt-3" />;
  if (!aiOn) return null;
  const label = check.stage === "RETURN" ? "Comparing with the pickup photos…" : "Checking against the listing photos…";
  const state = comparisonState(stored, now);
  if (state === "waiting") {
    return (
      <p className="mt-3 flex items-center gap-1.5 text-xs text-muted" role="status">
        <LoaderCircle className="size-3.5 animate-spin" aria-hidden /> {label}
      </p>
    );
  }
  return <PhotoComparisonRunner key={`${check.id}-${state}`} checkId={check.id} auto={state === "run"} label={label} />;
}
