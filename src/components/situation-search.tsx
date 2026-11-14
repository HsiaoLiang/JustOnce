import Form from "next/form";
import { Sparkles } from "lucide-react";
import { MAX_SITUATION_LENGTH } from "@/lib/situation";

/** "Describe what you need": AI turns a sentence into search filters. A plain GET form, like the main search. */
export function SituationSearch() {
  return (
    <Form action="/search/situation" role="search" aria-label="Describe what you need" className="mt-4 flex items-center gap-2 rounded-full border border-line-strong bg-paper py-1.5 pr-1.5 pl-5">
      <Sparkles className="size-4 shrink-0 text-accent-ink" aria-hidden />
      <label className="min-w-0 flex-1">
        <span className="sr-only">Or describe what you need</span>
        <input
          name="text"
          required
          maxLength={MAX_SITUATION_LENGTH}
          placeholder="Or describe it: “black-tie wedding on Saturday, under £50 a day”"
          className="w-full bg-transparent text-[0.95rem] text-ink placeholder:text-muted focus:outline-none"
        />
      </label>
      <button type="submit" className="shrink-0 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-ink-2">
        Find it
      </button>
    </Form>
  );
}
