"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Star } from "lucide-react";
import { acceptBooking, cancelBooking, declineBooking, submitCheck, submitReview, type FormState } from "@/server/actions/bookings";
import { CONDITIONS, type ConditionId } from "@/lib/catalogue";
import { MAX_CHECK_PHOTOS } from "@/lib/photos";
import { CLAIM_REASONS } from "@/lib/money";
import { fileDepositClaim, respondToClaim } from "@/server/actions/deposits";
import { cn } from "@/lib/cn";
import { PhotoUploader } from "./photo-uploader";
import { Button, FormAlert, Select, Textarea, inputClass } from "./ui";

function Submit({ children, variant = "primary", size = "md", className, pendingText, disabled }: { children: React.ReactNode; variant?: "primary" | "dark" | "secondary" | "danger"; size?: "sm" | "md" | "lg"; className?: string; pendingText?: string; disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} size={size} className={className} disabled={pending || disabled}>
      {pending ? (pendingText ?? "Saving…") : children}
    </Button>
  );
}

export function AcceptDeclineButtons({ bookingId, compact = false }: { bookingId: string; compact?: boolean }) {
  const [declining, setDeclining] = useState(false);
  if (declining) {
    return (
      <form action={declineBooking} className="w-full space-y-3">
        <input type="hidden" name="bookingId" value={bookingId} />
        <Textarea name="reason" rows={2} maxLength={300} placeholder="Optional: let them know why (e.g. I'm using it that weekend)" className="min-h-0" autoFocus />
        <div className="flex gap-2">
          <Submit variant="dark" size={compact ? "sm" : "md"} pendingText="Declining…">
            Decline request
          </Submit>
          <Button type="button" variant="ghost" size={compact ? "sm" : "md"} onClick={() => setDeclining(false)}>
            Back
          </Button>
        </div>
      </form>
    );
  }
  return (
    <div className="flex flex-wrap gap-2">
      <form action={acceptBooking}>
        <input type="hidden" name="bookingId" value={bookingId} />
        <Submit size={compact ? "sm" : "lg"} pendingText="Accepting…">
          Accept request
        </Submit>
      </form>
      <Button type="button" variant="secondary" size={compact ? "sm" : "lg"} onClick={() => setDeclining(true)}>
        Decline
      </Button>
    </div>
  );
}

export function CancelBookingButton({ bookingId, label, confirmText }: { bookingId: string; label: string; confirmText: string }) {
  return (
    <form
      action={cancelBooking}
      onSubmit={(e) => {
        if (!window.confirm(confirmText)) e.preventDefault();
      }}
    >
      <input type="hidden" name="bookingId" value={bookingId} />
      <Submit variant="danger" size="sm" pendingText="Cancelling…">
        {label}
      </Submit>
    </form>
  );
}

export function CheckForm({
  bookingId,
  stage,
  defaultCondition,
  samplePhoto,
}: {
  bookingId: string;
  stage: "PICKUP" | "RETURN";
  defaultCondition: ConditionId;
  samplePhoto?: string;
}) {
  const [state, action] = useActionState<FormState, FormData>(submitCheck, undefined);
  const [condition, setCondition] = useState<ConditionId>(defaultCondition);
  const [ok, setOk] = useState(true);
  const [photos, setPhotos] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [notes, setNotes] = useState("");
  const dirty = photos.length > 0 || notes.length > 0;
  const pickup = stage === "PICKUP";

  return (
    <form action={action} className="space-y-5" data-dirty={dirty ? "true" : "false"}>
      <input type="hidden" name="bookingId" value={bookingId} />
      <input type="hidden" name="stage" value={stage} />
      <input type="hidden" name="condition" value={condition} />
      <input type="hidden" name="conditionOk" value={ok ? "yes" : "no"} />

      <div>
        <p className="mb-2 text-sm font-semibold">1. Photograph the item</p>
        <PhotoUploader name="photos" max={MAX_CHECK_PHOTOS} showCover={false} label="Take or add photos" onChange={(urls, b) => (setPhotos(urls), setBusy(b))} sample={samplePhoto} />
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-semibold">2. {pickup ? "Does it match the listing?" : "Is it in the same condition as at pickup?"}</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          <Choice checked={ok} onSelect={() => setOk(true)} title={pickup ? "Yes, as described" : "Yes, same as before"} body={pickup ? "Everything's there and works." : "No new damage, nothing missing."} />
          <Choice checked={!ok} onSelect={() => setOk(false)} title={pickup ? "Something's different" : "Something's changed"} body="Note what's different below so there's a record." />
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-sm font-semibold">3. Condition right now</legend>
        <div className="flex flex-wrap gap-2">
          {CONDITIONS.map((c) => (
            <label
              key={c.id}
              className={cn(
                "cursor-pointer rounded-full border px-3.5 py-1.5 text-sm font-semibold has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ink",
                condition === c.id ? "border-ink bg-ink text-white" : "border-line-strong hover:border-ink",
              )}
            >
              <input type="radio" name="conditionPick" className="sr-only" checked={condition === c.id} onChange={() => setCondition(c.id)} />
              {c.label}
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor={`notes-${stage}`} className="mb-2 block text-sm font-semibold">
          Notes {ok && <span className="font-normal text-muted">(optional)</span>}
        </label>
        <Textarea
          id={`notes-${stage}`}
          name="notes"
          rows={2}
          maxLength={600}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="min-h-0"
          placeholder={ok ? "e.g. Two batteries and charger included, small scuff on the base already noted." : "What's different? e.g. Strap is frayed, lens cap missing."}
        />
      </div>

      <FormAlert>{state?.error}</FormAlert>
      <Submit size="lg" className="w-full sm:w-auto" pendingText="Confirming…" disabled={busy || photos.length === 0}>
        {busy ? "Waiting for photos…" : pickup ? "Confirm pickup" : "Confirm return"}
      </Submit>
      {photos.length === 0 && <p className="text-xs text-muted">Add at least one photo to confirm.</p>}
    </form>
  );
}

function Choice({ checked, onSelect, title, body }: { checked: boolean; onSelect: () => void; title: string; body: string }) {
  return (
    <label
      className={cn(
        "flex cursor-pointer gap-3 rounded-2xl border p-3.5 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ink",
        checked ? "border-ink bg-surface shadow-[inset_0_0_0_1px_var(--color-ink)]" : "border-line-strong hover:border-ink",
      )}
    >
      <input type="radio" checked={checked} onChange={onSelect} className="mt-1 size-4 accent-[var(--color-ink)]" />
      <span>
        <span className="block text-sm font-semibold">{title}</span>
        <span className="block text-xs text-muted">{body}</span>
      </span>
    </label>
  );
}

export function ReviewForm({ bookingId, subjectFirstName, asRenter }: { bookingId: string; subjectFirstName: string; asRenter: boolean }) {
  const [state, action] = useActionState<FormState, FormData>(submitReview, undefined);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const labels = ["", "Poor", "Not great", "OK", "Good", "Brilliant"];
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="bookingId" value={bookingId} />
      <input type="hidden" name="rating" value={rating || ""} />
      <div>
        <p className="mb-2 text-sm font-semibold">How was renting {asRenter ? "from" : "to"} {subjectFirstName}?</p>
        <div className="flex items-center gap-1" onMouseLeave={() => setHover(0)} role="radiogroup" aria-label="Star rating">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={rating === n}
              aria-label={`${n} star${n > 1 ? "s" : ""}`}
              onClick={() => setRating(n)}
              onMouseEnter={() => setHover(n)}
              className="rounded-md p-1 transition-transform hover:scale-110"
            >
              <Star className={cn("size-8", n <= (hover || rating) ? "fill-accent text-accent" : "fill-surface-2 text-line-strong")} strokeWidth={1.5} />
            </button>
          ))}
          <span className="ml-2 text-sm font-semibold text-ink-2">{labels[hover || rating]}</span>
        </div>
      </div>
      <Textarea
        name="comment"
        rows={3}
        maxLength={1000}
        placeholder={asRenter ? `What was the item like? How was ${subjectFirstName} to deal with?` : `Was ${subjectFirstName} careful, on time and easy to deal with?`}
      />
      <FormAlert>{state?.error}</FormAlert>
      <Submit pendingText="Posting…" disabled={!rating}>
        Post review
      </Submit>
    </form>
  );
}

export function ClaimForm({ bookingId, deposit, defaultNote }: { bookingId: string; deposit: number; defaultNote: string }) {
  const [state, action] = useActionState<FormState, FormData>(fileDepositClaim, undefined);
  const [amount, setAmount] = useState("");
  const max = deposit / 100;
  return (
    <form action={action} className="space-y-4" data-dirty={amount ? "true" : "false"}>
      <input type="hidden" name="bookingId" value={bookingId} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="claim-amount" className="mb-1.5 block text-sm font-semibold">
            Amount to claim <span className="font-normal text-muted">(up to £{max})</span>
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-2">£</span>
            <input
              id="claim-amount"
              name="amount"
              inputMode="decimal"
              autoComplete="off"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
              className={cn(inputClass, "h-11 pl-8")}
              placeholder={String(Math.round(max / 4))}
            />
          </div>
        </div>
        <div>
          <label htmlFor="claim-reason" className="mb-1.5 block text-sm font-semibold">
            Reason
          </label>
          <Select id="claim-reason" name="reason" defaultValue="DAMAGED">
            {CLAIM_REASONS.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <div>
        <label htmlFor="claim-note" className="mb-1.5 block text-sm font-semibold">
          What&apos;s wrong
        </label>
        <Textarea id="claim-note" name="note" rows={2} maxLength={600} defaultValue={defaultNote} className="min-h-0" />
        <p className="mt-1 text-xs text-muted">Your return photos are attached automatically, next to the pickup photos.</p>
      </div>
      <FormAlert>{state?.error}</FormAlert>
      <Submit pendingText="Sending claim…" disabled={!amount}>
        Claim from the deposit
      </Submit>
    </form>
  );
}

export function ClaimResponseForm({ bookingId, amount, ownerFirstName }: { bookingId: string; amount: string; ownerFirstName: string }) {
  const [state, action] = useActionState<FormState, FormData>(respondToClaim, undefined);
  const [mode, setMode] = useState<"choose" | "contest">("choose");
  const [photos, setPhotos] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  if (mode === "choose") {
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <form action={action}>
            <input type="hidden" name="bookingId" value={bookingId} />
            <input type="hidden" name="decision" value="accept" />
            <Submit variant="dark" pendingText="Accepting…">
              Accept: {ownerFirstName} keeps {amount}
            </Submit>
          </form>
          <Button type="button" variant="secondary" onClick={() => setMode("contest")}>
            Contest the claim
          </Button>
        </div>
        <FormAlert>{state?.error}</FormAlert>
      </div>
    );
  }
  return (
    <form action={action} className="space-y-4" data-dirty="true">
      <input type="hidden" name="bookingId" value={bookingId} />
      <input type="hidden" name="decision" value="contest" />
      <div>
        <label htmlFor="contest-note" className="mb-1.5 block text-sm font-semibold">
          Why don&apos;t you agree?
        </label>
        <Textarea id="contest-note" name="note" rows={3} maxLength={600} placeholder="e.g. The scuff was already there at pickup: you can see it in the second photo." autoFocus />
      </div>
      <div>
        <p className="mb-2 text-sm font-semibold">
          Your photos <span className="font-normal text-muted">(optional)</span>
        </p>
        <PhotoUploader name="photos" max={MAX_CHECK_PHOTOS} showCover={false} label="Add photos" onChange={(urls, b) => (setPhotos(urls), setBusy(b))} />
      </div>
      <FormAlert>{state?.error}</FormAlert>
      <div className="flex gap-2">
        <Submit pendingText="Sending…" disabled={busy}>
          {busy ? "Waiting for photos…" : photos.length ? "Contest with photos" : "Contest the claim"}
        </Submit>
        <Button type="button" variant="ghost" onClick={() => setMode("choose")}>
          Back
        </Button>
      </div>
    </form>
  );
}
