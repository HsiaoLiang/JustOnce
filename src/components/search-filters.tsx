"use client";

import { useRef, useState, type FormEvent } from "react";
import Form from "next/form";
import { SlidersHorizontal } from "lucide-react";
import { areasByRegion } from "@/lib/areas";
import { MAX_PRICES, SORTS, type ParsedSearch } from "@/lib/search-params";
import { cn } from "@/lib/cn";
import { Button, Input, Label, Select } from "./ui";

/** Filter form for /search. Plain GET form; selects and dates apply as soon as they change. */
export function SearchFilters({ filters, today, activeCount }: { filters: ParsedSearch; today: string; activeCount: number }) {
  const form = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState(false);
  const submit = () => form.current?.requestSubmit();
  const onDate = () => {
    const f = form.current;
    if (!f) return;
    const from = (f.elements.namedItem("from") as HTMLInputElement).value;
    const to = (f.elements.namedItem("to") as HTMLInputElement).value;
    if ((from && to) || (!from && !to)) submit();
  };

  // The keyword box exists twice (phone and desktop layouts); only send the visible one.
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    for (const input of e.currentTarget.querySelectorAll<HTMLInputElement>('input[name="q"]')) {
      input.disabled = input.offsetParent === null;
    }
  };

  return (
    <Form ref={form} action="/search" className="mt-4" role="search" onSubmit={onSubmit}>
      {filters.categorySlug && <input type="hidden" name="category" value={filters.categorySlug} />}
      {filters.view === "map" && <input type="hidden" name="view" value="map" />}
      {filters.bbox && <input type="hidden" name="bbox" value={filters.bbox.map((n) => n.toFixed(4)).join(",")} />}
      <div className="flex gap-2 md:hidden">
        <Input name="q" defaultValue={filters.q} placeholder="Search items" aria-label="Search items" className="flex-1 rounded-full" />
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="inline-flex h-11 items-center gap-2 rounded-full border border-line-strong px-4 text-sm font-semibold"
        >
          <SlidersHorizontal className="size-4" aria-hidden />
          Filters{activeCount > 0 && <span className="rounded-full bg-accent px-1.5 text-xs">{activeCount}</span>}
        </button>
      </div>

      <div className={cn(open ? "mt-4 grid" : "hidden", "grid-cols-2 gap-3 md:mt-0 md:grid md:grid-cols-[1.4fr_1.1fr_0.9fr_0.9fr_0.8fr_1fr] md:items-end")}>
        <div className="col-span-2 hidden md:col-span-1 md:block">
          <Label htmlFor="f-q">Keywords</Label>
          <Input id="f-q" name="q" defaultValue={filters.q} placeholder="Tuxedo, handbag, tent…" />
        </div>
        <div className="col-span-2 md:col-span-1">
          <Label htmlFor="f-area">Area</Label>
          <Select id="f-area" name="area" defaultValue={filters.area} onChange={submit}>
            <option value="">All of London</option>
            {areasByRegion().map(({ region, areas }) => (
              <optgroup key={region.id} label={region.label}>
                <option value={region.id}>All of {region.label}</option>
                {areas.map((a) => (
                  <option key={a.slug} value={a.slug}>
                    {a.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="f-from">Pick up</Label>
          <Input id="f-from" type="date" name="from" min={today} defaultValue={filters.from} onChange={onDate} />
        </div>
        <div>
          <Label htmlFor="f-to">Return</Label>
          <Input id="f-to" type="date" name="to" min={today} defaultValue={filters.to} onChange={onDate} />
        </div>
        <div>
          <Label htmlFor="f-max">Price per day</Label>
          <Select id="f-max" name="max" defaultValue={filters.max ? String(filters.max) : ""} onChange={submit}>
            <option value="">Any price</option>
            {MAX_PRICES.map((p) => (
              <option key={p} value={p}>
                Up to £{p}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="f-sort">Sort by</Label>
          <Select id="f-sort" name="sort" defaultValue={filters.sort} onChange={submit}>
            {SORTS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </Select>
        </div>
        <label className="col-span-2 flex cursor-pointer items-center gap-2 text-sm font-semibold md:col-span-6">
          <input type="checkbox" name="delivery" value="1" defaultChecked={filters.delivery} onChange={submit} className="size-4 accent-[var(--color-ink)]" />
          Delivery available <span className="font-normal text-muted">(courier or parcel locker)</span>
        </label>
        <Button type="submit" variant="dark" className="col-span-2 md:hidden">
          Show results
        </Button>
      </div>
      <button type="submit" className="sr-only">
        Search
      </button>
    </Form>
  );
}
