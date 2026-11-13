export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

/** "Priya S." — how people appear to strangers. */
export function shortName(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0]}.` : parts[0];
}

export function plural(count: number, one: string, many = `${one}s`): string {
  return `${count} ${count === 1 ? one : many}`;
}

export function ratingAverage(sum: number, count: number): number | null {
  return count > 0 ? sum / count : null;
}

export function formatRating(sum: number, count: number): string | null {
  const avg = ratingAverage(sum, count);
  if (avg === null) return null;
  // 5 → "5.0", 4.8 → "4.8", 4.6667 → "4.67"
  return Number.isInteger(avg) ? avg.toFixed(1) : avg.toFixed(2).replace(/0$/, "");
}
