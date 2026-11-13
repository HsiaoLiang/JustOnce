"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";
import { ImagePlus, LoaderCircle, Star, X } from "lucide-react";
import { uploadPhoto } from "@/lib/resize-image";
import { cn } from "@/lib/cn";

type Item = { key: string; url?: string; preview?: string; status: "uploading" | "done" | "error"; error?: string };

export function PhotoUploader({
  name,
  initial = [],
  max,
  onChange,
  label = "Add photos",
  showCover = true,
  sample,
}: {
  name: string;
  initial?: string[];
  max: number;
  onChange?: (urls: string[], busy: boolean) => void;
  label?: string;
  showCover?: boolean;
  /** Demo helper: a photo that can be added with one tap when you have none to hand. */
  sample?: string;
}) {
  const [items, setItems] = useState<Item[]>(() => initial.map((url) => ({ key: url, url, status: "done" })));
  const [dragging, setDragging] = useState(false);
  const inputId = useId();
  const counter = useRef(0);

  const urls = items.filter((i) => i.status === "done" && i.url).map((i) => i.url!);
  const busy = items.some((i) => i.status === "uploading");
  useEffect(() => onChange?.(urls, busy), [urls.join("|"), busy]); // eslint-disable-line react-hooks/exhaustive-deps

  const update = (key: string, patch: Partial<Item>) => setItems((list) => list.map((i) => (i.key === key ? { ...i, ...patch } : i)));

  async function addFiles(files: FileList | File[]) {
    const room = max - items.filter((i) => i.status !== "error").length;
    const chosen = Array.from(files).filter((f) => f.type.startsWith("image/") || /\.(heic|heif)$/i.test(f.name)).slice(0, Math.max(0, room));
    const added = chosen.map((file) => ({ file, key: `new-${++counter.current}`, preview: URL.createObjectURL(file) }));
    setItems((list) => [...list.filter((i) => i.status !== "error"), ...added.map(({ key, preview }) => ({ key, preview, status: "uploading" as const }))]);
    await Promise.all(
      added.map(async ({ file, key }) => {
        try {
          const url = await uploadPhoto(file);
          update(key, { url, status: "done" });
        } catch (e) {
          update(key, { status: "error", error: e instanceof Error ? e.message : "Upload failed." });
        }
      }),
    );
  }

  const remove = (key: string) => setItems((list) => list.filter((i) => i.key !== key));
  const makeCover = (key: string) => setItems((list) => [...list.filter((i) => i.key === key), ...list.filter((i) => i.key !== key)]);
  const full = items.filter((i) => i.status !== "error").length >= max;

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        if (e.dataTransfer.files.length) void addFiles(e.dataTransfer.files);
      }}
      className={cn("rounded-2xl transition-colors", dragging && "bg-accent-soft ring-2 ring-accent")}
    >
      <input type="hidden" name={name} value={JSON.stringify(urls)} />
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((item, index) => (
          <li key={item.key} className="group relative aspect-[4/3] overflow-hidden rounded-xl border border-line bg-surface">
            {item.url ? (
              <Image src={item.url} alt={`Photo ${index + 1}`} fill sizes="240px" className="object-cover" />
            ) : item.preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.preview} alt="" className="absolute inset-0 size-full object-cover" />
            ) : null}
            {item.status === "uploading" && (
              <div className="absolute inset-0 flex items-center justify-center bg-paper/60 backdrop-blur-[2px]">
                <LoaderCircle className="size-6 animate-spin text-ink" aria-label="Uploading" />
              </div>
            )}
            {item.status === "error" && (
              <div className="absolute inset-0 flex items-center justify-center bg-danger-soft/95 p-2 text-center text-xs font-medium text-danger">
                {item.error}
              </div>
            )}
            {showCover && index === 0 && item.status === "done" && (
              <span className="absolute top-2 left-2 rounded-full bg-ink px-2 py-0.5 text-[0.7rem] font-semibold text-white">Cover</span>
            )}
            <div className="absolute top-2 right-2 flex gap-1.5">
              {showCover && index > 0 && item.status === "done" && (
                <button
                  type="button"
                  onClick={() => makeCover(item.key)}
                  className="flex size-7 items-center justify-center rounded-full bg-paper/95 shadow-card hover:bg-paper"
                  aria-label={`Make photo ${index + 1} the cover`}
                  title="Make cover"
                >
                  <Star className="size-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={() => remove(item.key)}
                className="flex size-7 items-center justify-center rounded-full bg-paper/95 shadow-card hover:bg-paper"
                aria-label={`Remove photo ${index + 1}`}
              >
                <X className="size-3.5" />
              </button>
            </div>
          </li>
        ))}
        {!full && (
          <li>
            <label
              htmlFor={inputId}
              className="flex aspect-[4/3] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-line-strong text-center text-sm font-semibold text-ink-2 transition-colors hover:border-ink hover:bg-surface focus-within:border-ink"
            >
              <ImagePlus className="size-6" aria-hidden />
              {label}
              <span className="text-xs font-normal text-muted">or drop them here</span>
              <input
                id={inputId}
                type="file"
                accept="image/*"
                multiple
                className="sr-only"
                onChange={(e) => {
                  if (e.target.files?.length) void addFiles(e.target.files);
                  e.target.value = "";
                }}
              />
            </label>
          </li>
        )}
      </ul>
      {sample && !full && !urls.includes(sample) && (
        <button
          type="button"
          onClick={() => setItems((list) => [...list, { key: `sample-${++counter.current}`, url: sample, status: "done" }])}
          className="mt-3 text-sm font-semibold text-muted underline underline-offset-4 hover:text-ink"
        >
          No photo to hand? Use the listing photo (demo)
        </button>
      )}
    </div>
  );
}
