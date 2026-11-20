// Images are served as-is from /public. next/image doesn't add the base path to plain src strings, so this does.
export default function imageLoader({ src, width }: { src: string; width: number }): string {
  if (/^https?:\/\//.test(src)) return src;
  return `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}${src}?w=${width}`;
}
