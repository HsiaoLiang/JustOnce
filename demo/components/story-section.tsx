import { HandHeart, Search, ShieldQuestion, Sprout } from "lucide-react";
import { LinkButton } from "@/components/ui";

const BEATS = [
  {
    icon: ShieldQuestion,
    kicker: "The gap",
    title: "Borrowing from strangers is hard",
    body: "There's no easy way to rent everyday things from people nearby. Most rental platforms we looked at are built around insurance, contracts and paperwork. That makes sense for a car, but it's far too heavy for a suit you need for one wedding.",
  },
  {
    icon: HandHeart,
    kicker: "Our bet",
    title: "Trust comes from what people share",
    body: "People from the same school, the same company or the same club find it much easier to trust each other, and are much more willing to lend. We wanted to build on that trust instead of replacing it with insurance.",
  },
  {
    icon: Search,
    kicker: "What's different",
    title: "Filter to your community",
    body: "Verify once with your school or work email, then search only your people, list items just for your members, and ask on your community's exchange board.",
  },
  {
    icon: Sprout,
    kicker: "How it grows",
    title: "One campus at a time",
    body: "Start with one school. Its exchange board is where people already ask “does anyone have a…?”, so that's how the first users arrive. Then the next campus, the next office: one small community after another.",
  },
];

export function StorySection() {
  return (
    <section id="story" aria-labelledby="story-heading" className="scroll-mt-24 pt-4">
      <div className="max-w-3xl">
        <p className="font-mono text-xs tracking-[0.14em] text-muted uppercase">Why we built it</p>
        <h2 id="story-heading" className="mt-2 text-3xl font-semibold sm:text-[2.6rem] sm:leading-[1.08]">
          Renting from a stranger feels risky. Renting from a classmate doesn&apos;t.
        </h2>
      </div>
      <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {BEATS.map((b, i) => (
          <li key={b.kicker} className="flex flex-col rounded-3xl border border-line p-6">
            <span className="flex items-center justify-between">
              <span className="flex size-10 items-center justify-center rounded-full bg-accent-soft text-accent-ink">
                <b.icon className="size-5" aria-hidden />
              </span>
              <span className="font-mono text-xs text-muted">0{i + 1}</span>
            </span>
            <p className="mt-5 font-mono text-[0.7rem] tracking-[0.14em] text-accent-ink uppercase">{b.kicker}</p>
            <h3 className="mt-1 text-lg font-semibold">{b.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-2">{b.body}</p>
          </li>
        ))}
      </ol>
      <div className="mt-4 flex flex-col gap-4 rounded-3xl bg-accent-soft p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <p className="max-w-2xl text-ink-2">
          <span className="font-semibold text-ink">The business model isn&apos;t finished yet.</span> But we think the trust a community already has is the right
          starting point for a rental platform, and that small communities are how it grows.
        </p>
        <LinkButton href="/communities" variant="dark" className="shrink-0">
          See the communities
        </LinkButton>
      </div>
    </section>
  );
}
