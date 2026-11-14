"use client";

import Image from "next/image";
import { useActionState, useMemo, useState, type ReactNode } from "react";
import { Camera, Shirt, Snowflake, Tent } from "lucide-react";
import { saveListing, type ListingFormState } from "@/server/actions/listings";
import { areaName, areasByRegion } from "@/lib/areas";
import { CATEGORIES, CONDITIONS, conditionLabel, type CategoryId } from "@/lib/catalogue";
import type { ISODate } from "@/lib/dates";
import type { ListingFormValues } from "@/lib/listing-form-values";
import { DEPOSIT_PROMISE, formatGBP, HANDOVER_METHODS, parsePounds, penceToPoundsInput, suggestedDeposit } from "@/lib/money";
import { MAX_LISTING_PHOTOS } from "@/lib/photos";
import { cn, plural } from "@/lib/cn";
import dynamic from "next/dynamic";
import { Calendar } from "./calendar";

const PinPicker = dynamic(() => import("./map/pin-picker").then((m) => m.PinPicker), {
  ssr: false,
  loading: () => <div className="h-56 w-full animate-pulse rounded-2xl bg-surface" />,
});
import { PhotoUploader } from "./photo-uploader";
import { Button, FieldError, FormAlert, Input, Label, Select, Textarea, inputClass } from "./ui";

const CATEGORY_ICONS: Record<CategoryId, ReactNode> = {
  FORMALWEAR: <Shirt className="size-5" />,
  CAMERAS: <Camera className="size-5" />,
  CAMPING: <Tent className="size-5" />,
  SEASONAL: <Snowflake className="size-5" />,
};

export function ListingForm({ initial, today, locked = [], mode }: { initial: ListingFormValues; today: ISODate; locked?: ISODate[]; mode: "create" | "edit" }) {
  const [state, formAction, pending] = useActionState<ListingFormState, FormData>(saveListing, undefined);
  const [v, setV] = useState(initial);
  const [photos, setPhotos] = useState(initial.photos);
  const [uploading, setUploading] = useState(false);
  const errors = state?.fieldErrors ?? {};
  const set = <K extends keyof ListingFormValues>(key: K, value: ListingFormValues[K]) => setV((prev) => ({ ...prev, [key]: value }));

  const blocked = useMemo(() => new Set(v.blockedDates.filter((d) => d >= v.availableFrom && d <= v.availableTo)), [v.blockedDates, v.availableFrom, v.availableTo]);
  const lockedSet = useMemo(() => new Set(locked), [locked]);
  const pricePence = parsePounds(v.price);
  const replacementPence = parsePounds(v.replacementValue);
  const suggested = replacementPence ? suggestedDeposit(replacementPence) : null;
  const windowValid = v.availableFrom && v.availableTo && v.availableTo >= v.availableFrom;

  const toggleDay = (day: ISODate) => set("blockedDates", blocked.has(day) ? v.blockedDates.filter((d) => d !== day) : [...v.blockedDates, day]);

  return (
    <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_320px]">
      <form action={formAction} className="min-w-0 space-y-10" noValidate>
        {v.id && <input type="hidden" name="id" value={v.id} />}
        <input type="hidden" name="blockedDates" value={JSON.stringify([...blocked])} />

        <Section title="Photos" hint={`Up to ${MAX_LISTING_PHOTOS}. The first photo is the cover, so pick a bright, clear one.`}>
          <PhotoUploader
            name="photos"
            initial={initial.photos}
            max={MAX_LISTING_PHOTOS}
            onChange={(urls, busy) => {
              setPhotos(urls);
              setUploading(busy);
            }}
          />
          <FieldError>{errors.photos}</FieldError>
        </Section>

        <Section title="The basics">
          <div className="space-y-5">
            <div>
              <Label htmlFor="title" hint={`${v.title.length}/80`}>
                Title
              </Label>
              <Input id="title" name="title" value={v.title} onChange={(e) => set("title", e.target.value)} maxLength={80} placeholder="e.g. Navy three-piece suit, 40R" aria-invalid={!!errors.title} />
              <FieldError>{errors.title}</FieldError>
            </div>

            <fieldset>
              <legend className="mb-1.5 text-sm font-semibold">Category</legend>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {CATEGORIES.map((c) => (
                  <label
                    key={c.id}
                    className={cn(
                      "flex cursor-pointer flex-col gap-2 rounded-2xl border p-3.5 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ink",
                      v.category === c.id ? "border-ink bg-surface shadow-[inset_0_0_0_1px_var(--color-ink)]" : "border-line-strong hover:border-ink",
                    )}
                  >
                    <input type="radio" name="category" value={c.id} checked={v.category === c.id} onChange={() => set("category", c.id)} className="sr-only" />
                    {CATEGORY_ICONS[c.id]}
                    <span className="text-sm font-semibold">{c.label}</span>
                  </label>
                ))}
              </div>
              <FieldError>{errors.category}</FieldError>
            </fieldset>

            <fieldset>
              <legend className="mb-1.5 text-sm font-semibold">Condition</legend>
              <div className="flex flex-wrap gap-2">
                {CONDITIONS.map((c) => (
                  <label
                    key={c.id}
                    className={cn(
                      "cursor-pointer rounded-full border px-4 py-2 text-sm font-semibold transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ink",
                      v.condition === c.id ? "border-ink bg-ink text-white" : "border-line-strong hover:border-ink",
                    )}
                  >
                    <input type="radio" name="condition" value={c.id} checked={v.condition === c.id} onChange={() => set("condition", c.id)} className="sr-only" />
                    {c.label}
                  </label>
                ))}
              </div>
              <p className="mt-1.5 text-sm text-muted">{CONDITIONS.find((c) => c.id === v.condition)?.hint ?? "How worn is it? Be honest: it's checked at pickup."}</p>
              <FieldError>{errors.condition}</FieldError>
            </fieldset>

            <div>
              <Label htmlFor="description" hint={`${v.description.length}/2000`}>
                Description
              </Label>
              <Textarea
                id="description"
                name="description"
                value={v.description}
                onChange={(e) => set("description", e.target.value)}
                maxLength={2000}
                rows={5}
                placeholder="What is it, what's included, and what's it great for? Mention anything a renter should know."
                aria-invalid={!!errors.description}
              />
              <FieldError>{errors.description}</FieldError>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <Label htmlFor="brand" hint="Optional">
                  Brand
                </Label>
                <Input id="brand" name="brand" value={v.brand} onChange={(e) => set("brand", e.target.value)} maxLength={60} placeholder="e.g. Reiss, Sony, Vango" />
                <FieldError>{errors.brand}</FieldError>
              </div>
              <div>
                <Label htmlFor="size" hint="Optional">
                  Size or dimensions
                </Label>
                <Input id="size" name="size" value={v.size} onChange={(e) => set("size", e.target.value)} maxLength={60} placeholder="e.g. UK 10, 40R, sleeps 4" />
                <FieldError>{errors.size}</FieldError>
              </div>
            </div>
          </div>
        </Section>

        <Section title="Price and deposit" hint="Renters pay a 10% service fee on top. You keep 100% of your daily price.">
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <Label htmlFor="price">Price per day</Label>
              <MoneyInput id="price" name="price" value={v.price} onChange={(x) => set("price", x)} suffix="/day" invalid={!!errors.price} />
              <FieldError>{errors.price}</FieldError>
            </div>
            <div>
              <Label htmlFor="replacementValue" hint="Optional">
                What would it cost to replace?
              </Label>
              <MoneyInput id="replacementValue" name="replacementValue" value={v.replacementValue} onChange={(x) => set("replacementValue", x)} invalid={!!errors.replacementValue} />
              <FieldError>{errors.replacementValue}</FieldError>
            </div>
            <div>
              <Label htmlFor="deposit">Refundable deposit</Label>
              <MoneyInput id="deposit" name="deposit" value={v.deposit} onChange={(x) => set("deposit", x)} invalid={!!errors.deposit} />
              {suggested !== null && v.deposit !== penceToPoundsInput(suggested) && (
                <button type="button" onClick={() => set("deposit", penceToPoundsInput(suggested))} className="mt-1.5 text-sm font-semibold underline decoration-accent decoration-2 underline-offset-4">
                  Use the suggested {formatGBP(suggested)} (25% of replacement)
                </button>
              )}
              <FieldError>{errors.deposit}</FieldError>
            </div>
            <label className="flex cursor-pointer items-start gap-3 self-end rounded-2xl border border-line-strong p-3.5 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ink">
              <input type="checkbox" name="fullDepositOnly" checked={v.fullDepositOnly} onChange={(e) => set("fullDepositOnly", e.target.checked)} className="mt-0.5 size-4 accent-[var(--color-ink)]" />
              <span>
                <span className="block text-sm font-semibold">Always take the full deposit</span>
                <span className="block text-xs text-muted">
                  By default, verified renters with 3+ good reviews pay half.{" "}
                  <a href="/policies#trusted-renters" target="_blank" className="underline underline-offset-2">
                    Read the policy
                  </a>
                </span>
              </span>
            </label>
          </div>
          <p className="mt-3 rounded-xl bg-surface px-4 py-3 text-sm text-ink-2">
            {pricePence
              ? <>A weekend rental (3 days) earns you <strong className="text-ink">{formatGBP(pricePence * 3)}</strong>. {DEPOSIT_PROMISE}</>
              : "Tip: look at similar items in search to pick a price that gets booked."}
          </p>
        </Section>

        <Section title="Pickup and delivery">
          <div className="space-y-5">
            <fieldset>
              <legend className="mb-1.5 text-sm font-semibold">How can it change hands?</legend>
              <div className="grid gap-2 sm:grid-cols-3">
                {HANDOVER_METHODS.map((m) => {
                  const checked = v.handoverMethods.includes(m.id);
                  return (
                    <label
                      key={m.id}
                      className={cn(
                        "flex cursor-pointer gap-2.5 rounded-2xl border p-3.5 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ink",
                        checked ? "border-ink bg-surface shadow-[inset_0_0_0_1px_var(--color-ink)]" : "border-line-strong hover:border-ink",
                      )}
                    >
                      <input
                        type="checkbox"
                        name="handoverMethods"
                        value={m.id}
                        checked={checked}
                        onChange={() => set("handoverMethods", checked ? v.handoverMethods.filter((x) => x !== m.id) : [...v.handoverMethods, m.id])}
                        className="mt-0.5 size-4 accent-[var(--color-ink)]"
                      />
                      <span>
                        <span className="block text-sm font-semibold">{m.label}</span>
                        <span className="block text-xs text-muted">{m.hint}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
              <p className="mt-1.5 text-xs text-muted">Renters pay for delivery (simulated): locker £3 each way, courier £6–£9 each way. Photo checks still happen at both ends.</p>
              <FieldError>{errors.handoverMethods}</FieldError>
            </fieldset>
            <div>
              <Label htmlFor="area">Pickup area</Label>
              <Select id="area" name="area" value={v.area} onChange={(e) => set("area", e.target.value)} aria-invalid={!!errors.area}>
                <option value="">Choose a neighbourhood</option>
                {areasByRegion().map(({ region, areas }) => (
                  <optgroup key={region.id} label={region.label}>
                    {areas.map((a) => (
                      <option key={a.slug} value={a.slug}>
                        {a.name} ({a.postcode})
                      </option>
                    ))}
                  </optgroup>
                ))}
              </Select>
              <FieldError>{errors.area}</FieldError>
            </div>
            <div>
              <Label htmlFor="pickupNotes" hint="Optional, only shared once you accept">
                Pickup details
              </Label>
              <Textarea
                id="pickupNotes"
                name="pickupNotes"
                value={v.pickupNotes}
                onChange={(e) => set("pickupNotes", e.target.value)}
                maxLength={300}
                rows={2}
                className="min-h-0"
                placeholder="e.g. Meet at Hackney Central station, weekday evenings after 6pm."
              />
              <FieldError>{errors.pickupNotes}</FieldError>
            </div>
            <div>
              <p className="mb-1.5 text-sm font-semibold">
                Exact pickup point <span className="font-normal text-muted">Optional, only shared once you accept</span>
              </p>
              <PinPicker area={v.area} initial={initial.pickupPoint} />
              <p className="mt-1 text-xs text-muted">Public maps only ever show a rough spot in your neighbourhood, never your address.</p>
              <FieldError>{errors.pickupPoint}</FieldError>
            </div>
          </div>
        </Section>

        <Section title="Availability" hint="Renters can only pick days inside this window. Tap days on the calendar to block out dates you're away.">
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <Label htmlFor="availableFrom">Available from</Label>
              <Input id="availableFrom" type="date" name="availableFrom" value={v.availableFrom} min={mode === "create" ? today : undefined} onChange={(e) => set("availableFrom", e.target.value)} />
            </div>
            <div>
              <Label htmlFor="availableTo">Available until</Label>
              <Input id="availableTo" type="date" name="availableTo" value={v.availableTo} min={v.availableFrom || today} onChange={(e) => set("availableTo", e.target.value)} />
            </div>
          </div>
          <FieldError>{errors.availability}</FieldError>
          {windowValid && (
            <div className="mt-5 rounded-2xl border border-line p-4 sm:p-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-sm font-semibold">{blocked.size ? `${plural(blocked.size, "day")} blocked out` : "No days blocked out"}</p>
                {blocked.size > 0 && (
                  <button type="button" className="text-sm font-semibold underline underline-offset-4" onClick={() => set("blockedDates", [])}>
                    Clear
                  </button>
                )}
              </div>
              <Calendar mode="toggle" months={2} window={{ from: v.availableFrom, to: v.availableTo, today }} selected={blocked} onToggle={toggleDay} locked={lockedSet} />
              <p className="mt-3 text-xs text-muted">Dark days are blocked. {locked.length > 0 && "Crossed-out days are already booked."}</p>
            </div>
          )}
        </Section>

        <div className="space-y-3 border-t border-line pt-8">
          <FormAlert>{state?.error}</FormAlert>
          <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={pending || uploading}>
            {uploading ? "Waiting for photos…" : pending ? "Saving…" : mode === "create" ? "Publish listing" : "Save changes"}
          </Button>
        </div>
      </form>

      <aside className="hidden lg:block">
        <div className="sticky top-24">
          <p className="mb-3 font-mono text-xs tracking-[0.14em] text-muted uppercase">Preview</p>
          <div className="rounded-2xl">
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-surface">
              {photos[0] ? (
                <Image src={photos[0]} alt="" fill sizes="320px" className="object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted">Your cover photo</div>
              )}
            </div>
            <p className="mt-3 line-clamp-1 font-semibold">{v.title || "Your item's title"}</p>
            <p className="text-sm text-muted">
              {v.area ? areaName(v.area) : "Pickup area"} · {v.condition ? conditionLabel(v.condition) : "Condition"}
            </p>
            <p className="mt-1">
              <span className="font-semibold">{pricePence ? formatGBP(pricePence) : "£–"}</span> <span className="text-muted">per day</span>
            </p>
          </div>
          <p className="mt-6 text-sm text-muted">This is how your item appears in search. Renters see the deposit and your pickup area before they ask.</p>
        </div>
      </aside>
    </div>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-xl font-semibold">{title}</h2>
      {hint && <p className="mt-1 text-sm text-muted">{hint}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function MoneyInput({ id, name, value, onChange, suffix, invalid }: { id: string; name: string; value: string; onChange: (v: string) => void; suffix?: string; invalid?: boolean }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-2">£</span>
      <input
        id={id}
        name={name}
        inputMode="decimal"
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^\d.]/g, ""))}
        aria-invalid={invalid}
        className={cn(inputClass, "h-11 pl-8", suffix && "pr-14")}
      />
      {suffix && <span className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-sm text-muted">{suffix}</span>}
    </div>
  );
}
