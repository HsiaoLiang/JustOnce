import Form from "next/form";
import { Search } from "lucide-react";
import { areasByRegion } from "@/lib/areas";
import { todayInLondon } from "@/lib/dates";

/** The home page search. A plain GET form, so it works before any JavaScript loads. */
export type HeroCommunity = { slug: string; shortName: string; name: string; type: "UNIVERSITY" | "COMPANY" };

/** `community` preselects the viewer's own verified community; the field always stays optional. */
export function HeroSearch({ communities = [], community = "" }: { communities?: HeroCommunity[]; community?: string }) {
  const today = todayInLondon();
  const field = "flex flex-col justify-center px-5 py-2.5 md:py-0";
  const label = "text-[0.7rem] font-bold tracking-wide text-ink uppercase";
  const control = "w-full bg-transparent text-[0.95rem] text-ink placeholder:text-muted focus:outline-none";
  return (
    <Form
      action="/search"
      role="search"
      className="grid overflow-hidden rounded-3xl border border-line-strong bg-paper shadow-card md:h-[4.5rem] md:grid-cols-[1.3fr_1fr_1fr_0.85fr_0.85fr_auto] md:rounded-full md:divide-x md:divide-line"
    >
      <label className={`${field} border-b border-line md:border-b-0`}>
        <span className={label}>What</span>
        <input name="q" placeholder="Tuxedo, handbag, tent…" className={control} />
      </label>
      <label className={`${field} border-b border-line md:border-b-0`}>
        <span className={label}>Where</span>
        <select name="area" defaultValue="" className={`${control} -ml-1 cursor-pointer appearance-none`}>
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
        </select>
      </label>
      <label className={`${field} border-b border-line md:border-b-0`}>
        <span className={label}>
          Community <span className="font-medium tracking-normal text-muted normal-case">(optional)</span>
        </span>
        <select name="community" defaultValue={community} className={`${control} -ml-1 cursor-pointer appearance-none`}>
          <option value="">Everyone in London</option>
          {(["UNIVERSITY", "COMPANY"] as const).map((type) => {
            const group = communities.filter((c) => c.type === type);
            if (!group.length) return null;
            return (
              <optgroup key={type} label={type === "UNIVERSITY" ? "Schools" : "Companies"}>
                {group.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.shortName} only
                  </option>
                ))}
              </optgroup>
            );
          })}
        </select>
      </label>
      <div className="grid grid-cols-2 border-b border-line md:contents md:border-b-0">
        <label className={`${field} border-r border-line md:border-r-0`}>
          <span className={label}>Pick up</span>
          <input type="date" name="from" min={today} className={control} />
        </label>
        <label className={field}>
          <span className={label}>Return</span>
          <input type="date" name="to" min={today} className={control} />
        </label>
      </div>
      <div className="p-3 md:p-2.5">
        <button
          type="submit"
          className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-accent px-6 font-semibold text-ink transition-colors hover:bg-accent-hover md:h-full md:w-auto"
        >
          <Search className="size-5" strokeWidth={2.4} aria-hidden />
          <span>Search</span>
        </button>
      </div>
    </Form>
  );
}
