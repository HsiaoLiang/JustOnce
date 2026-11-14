// Shared by the two AI searches (described in words, or shown in a photo).
import type { ParsedSearch } from "@/lib/search-params";
import { searchListings } from "./queries";

const count = async (s: ParsedSearch) =>
  (await searchListings({ q: s.q, category: s.category, area: s.area, from: s.from, to: s.to, maxPrice: s.max ? s.max * 100 : undefined })).length;

/**
 * Keywords are the model's riskiest guess: every word has to match. If they
 * leave nothing, try the first word alone, then no keywords at all, as long as
 * some other filter remains to keep the results relevant.
 */
export async function relaxKeywords(search: ParsedSearch): Promise<ParsedSearch> {
  if (!search.q || (await count(search)) > 0) return search;
  const [first, ...rest] = search.q.split(/\s+/);
  if (rest.length) {
    const narrower = { ...search, q: first };
    if ((await count(narrower)) > 0) return narrower;
  }
  return search.category || search.area || search.from ? { ...search, q: "" } : search;
}
