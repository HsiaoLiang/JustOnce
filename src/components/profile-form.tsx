"use client";

import { useActionState, useId, useState } from "react";
import { useFormStatus } from "react-dom";
import { LoaderCircle } from "lucide-react";
import { updateProfile, type ProfileState } from "@/server/actions/profile";
import { areasByRegion } from "@/lib/areas";
import { uploadPhoto } from "@/lib/resize-image";
import { Avatar, Button, FieldError, Input, Label, Select, Textarea } from "./ui";

export function ProfileForm({ initial }: { initial: { name: string; bio: string; area: string; avatarUrl: string | null } }) {
  const [state, action] = useActionState<ProfileState, FormData>(updateProfile, undefined);
  const [v, setV] = useState(initial);
  const [busy, setBusy] = useState(false);
  const errors = state?.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-5">
      <AvatarField name={v.name} initial={initial.avatarUrl} onBusy={setBusy} />
      <FieldError>{errors.avatar}</FieldError>
      <div>
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} maxLength={60} aria-invalid={!!errors.name} />
        <FieldError>{errors.name}</FieldError>
      </div>
      <div>
        <Label htmlFor="area">Area</Label>
        <Select id="area" name="area" value={v.area} onChange={(e) => setV({ ...v, area: e.target.value })}>
          <option value="">Prefer not to say</option>
          {areasByRegion().map(({ region, areas }) => (
            <optgroup key={region.id} label={region.label}>
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
        <Label htmlFor="bio" hint={`${v.bio.length}/400`}>
          About you
        </Label>
        <Textarea
          id="bio"
          name="bio"
          value={v.bio}
          onChange={(e) => setV({ ...v, bio: e.target.value })}
          maxLength={400}
          rows={4}
          placeholder="A line or two helps people trust you: what you do, what you lend, how you like to hand things over."
          aria-invalid={!!errors.bio}
        />
        <FieldError>{errors.bio}</FieldError>
      </div>
      <SaveButton disabled={busy} />
    </form>
  );
}

function SaveButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="dark" disabled={pending || disabled}>
      {pending ? "Saving…" : "Save profile"}
    </Button>
  );
}

function AvatarField({ name, initial, onBusy }: { name: string; initial: string | null; onBusy: (busy: boolean) => void }) {
  const [url, setUrl] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputId = useId();
  const pick = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    onBusy(true);
    setError(null);
    try {
      setUrl(await uploadPhoto(file));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
      onBusy(false);
    }
  };
  return (
    <div>
      <p className="mb-2 text-sm font-semibold">Profile photo</p>
      <input type="hidden" name="avatar" value={JSON.stringify(url ? [url] : [])} />
      <div className="flex items-center gap-4">
        <div className="relative">
          <Avatar name={name || "?"} src={url} size={72} />
          {busy && (
            <span className="absolute inset-0 flex items-center justify-center rounded-full bg-paper/70">
              <LoaderCircle className="size-5 animate-spin" aria-label="Uploading" />
            </span>
          )}
        </div>
        <label htmlFor={inputId} className="cursor-pointer rounded-full border border-line-strong px-4 py-2 text-sm font-semibold hover:border-ink">
          {url ? "Change photo" : "Add a photo"}
          <input id={inputId} type="file" accept="image/*" className="sr-only" onChange={(e) => void pick(e.target.files?.[0])} />
        </label>
        {url && (
          <button type="button" onClick={() => setUrl(null)} className="text-sm font-semibold text-muted underline underline-offset-4 hover:text-ink">
            Remove
          </button>
        )}
      </div>
      {error && <p className="mt-2 text-sm font-medium text-danger">{error}</p>}
    </div>
  );
}
