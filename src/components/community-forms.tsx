"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Mail, IdCard, LoaderCircle } from "lucide-react";
import {
  addCommunityComment,
  confirmEmailCode,
  createCommunityPost,
  requestEmailCode,
  submitIdCard,
  type CommentState,
  type PostState,
  type VerifyState,
} from "@/server/actions/communities";
import { POST_TYPES } from "@/lib/communities";
import { cn } from "@/lib/cn";
import { PhotoUploader } from "./photo-uploader";
import { Button, FieldError, FormAlert, Input, Label, Textarea } from "./ui";

// ------------------------------------------------------------ verification

export function VerifyCommunityForms({ slug, shortName, domains, pendingIdCard, pendingEmail }: { slug: string; shortName: string; domains: string[]; pendingIdCard: boolean; pendingEmail: string | null }) {
  const [tab, setTab] = useState<"email" | "id">(pendingIdCard ? "id" : "email");
  return (
    <div>
      <div role="tablist" aria-label="How to verify" className="grid grid-cols-2 gap-2 rounded-full bg-surface p-1">
        {(
          [
            { id: "email", label: "School email", icon: Mail },
            { id: "id", label: "Student ID card", icon: IdCard },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cn("inline-flex items-center justify-center gap-2 rounded-full px-3 py-2.5 text-sm font-semibold", tab === t.id ? "bg-paper shadow-card" : "text-muted")}
          >
            <t.icon className="size-4" aria-hidden />
            {t.label}
          </button>
        ))}
      </div>
      <div className="mt-6">{tab === "email" ? <EmailVerify slug={slug} shortName={shortName} domains={domains} pendingEmail={pendingEmail} /> : <IdCardVerify slug={slug} shortName={shortName} pending={pendingIdCard} />}</div>
    </div>
  );
}

function EmailVerify({ slug, shortName, domains, pendingEmail }: { slug: string; shortName: string; domains: string[]; pendingEmail: string | null }) {
  const [sent, sendAction, sending] = useActionState<VerifyState, FormData>(requestEmailCode, pendingEmail ? { sentTo: pendingEmail } : undefined);
  const [confirmed, confirmAction, confirming] = useActionState<VerifyState, FormData>(confirmEmailCode, undefined);
  const sentTo = sent?.sentTo ?? confirmed?.sentTo;

  return (
    <div className="space-y-6">
      <form action={sendAction} className="space-y-3">
        <input type="hidden" name="slug" value={slug} />
        <div>
          <Label htmlFor="email" hint={domains.map((d) => `@${d}`).join(", ")}>
            Your {shortName} email
          </Label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input id="email" name="email" type="email" inputMode="email" autoComplete="email" required placeholder={`firstname@${domains[0] ?? "school.ac.uk"}`} className="flex-1" />
            <Button type="submit" variant={sentTo ? "secondary" : "primary"} disabled={sending}>
              {sending && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
              {sentTo ? "Send a new code" : "Send code"}
            </Button>
          </div>
        </div>
        {sent?.error && <FormAlert>{sent.error}</FormAlert>}
      </form>

      {sentTo && (
        <form action={confirmAction} className="space-y-3 rounded-2xl border border-line p-4">
          <input type="hidden" name="slug" value={slug} />
          <p className="text-sm text-ink-2">
            We sent a 6-digit code to <strong className="text-ink">{sentTo}</strong>. It works for 15 minutes.
          </p>
          {sent?.demoCode && (
            <FormAlert tone="info">
              Demo mode: email isn&apos;t connected yet, so here&apos;s your code: <strong className="font-mono tracking-widest">{sent.demoCode}</strong>
            </FormAlert>
          )}
          <div>
            <Label htmlFor="code">Code</Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,7}" maxLength={7} required className="flex-1 font-mono tracking-[0.3em]" />
              <Button type="submit" disabled={confirming}>
                {confirming && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
                Verify
              </Button>
            </div>
          </div>
          {confirmed?.error && <FormAlert>{confirmed.error}</FormAlert>}
        </form>
      )}
    </div>
  );
}

function IdCardVerify({ slug, shortName, pending }: { slug: string; shortName: string; pending: boolean }) {
  const [state, action, submitting] = useActionState<VerifyState, FormData>(submitIdCard, pending ? { pending: true } : undefined);
  const [busy, setBusy] = useState(false);
  const [count, setCount] = useState(0);
  if (state?.pending) {
    return (
      <FormAlert tone="success">
        Thanks. Your {shortName} ID card is with our team. We check it within a day and you&apos;ll get the badge as soon as it&apos;s approved.
      </FormAlert>
    );
  }
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="slug" value={slug} />
      <p className="text-sm text-ink-2">
        No {shortName} email? Upload a clear photo of the front of your student or staff card. Only our review team sees it, and you can cover your photo and card number.
      </p>
      <PhotoUploader
        name="idCard"
        max={1}
        label="Add ID card photo"
        showCover={false}
        onChange={(urls, b) => {
          setBusy(b);
          setCount(urls.length);
        }}
      />
      {state?.error && <FormAlert>{state.error}</FormAlert>}
      <Button type="submit" disabled={submitting || busy || count === 0}>
        {submitting && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
        Send for review
      </Button>
    </form>
  );
}

// ------------------------------------------------------------ exchange board

export function NewPostForm({ slug, today, defaultType = "REQUEST" }: { slug: string; today: string; defaultType?: "REQUEST" | "OFFER" }) {
  const [state, action, pending] = useActionState<PostState, FormData>(createCommunityPost, undefined);
  const [type, setType] = useState<"REQUEST" | "OFFER">(defaultType);
  const [busy, setBusy] = useState(false);
  const errors = state?.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="type" value={type} />
      <div role="radiogroup" aria-label="Post type" className="grid grid-cols-2 gap-2">
        {POST_TYPES.map((t) => (
          <button
            key={t.id}
            type="button"
            role="radio"
            aria-checked={type === t.id}
            onClick={() => setType(t.id)}
            className={cn("rounded-2xl border px-3 py-3 text-left text-sm", type === t.id ? "border-ink bg-ink text-paper" : "border-line-strong hover:border-ink")}
          >
            <span className="block font-semibold">{t.label}</span>
            <span className={cn("block text-xs", type === t.id ? "text-paper/75" : "text-muted")}>{t.id === "REQUEST" ? "Ask members to lend you something" : "Let members know what you can lend"}</span>
          </button>
        ))}
      </div>
      <div>
        <Label htmlFor="post-title">Title</Label>
        <Input id="post-title" name="title" maxLength={80} required placeholder={type === "REQUEST" ? "Need a BA II Plus calculator for Thursday" : "27-inch monitor free to borrow this term"} aria-invalid={!!errors.title} />
        <FieldError>{errors.title}</FieldError>
      </div>
      <div>
        <Label htmlFor="post-body">Details</Label>
        <Textarea id="post-body" name="body" rows={4} maxLength={1000} required placeholder="When, where on campus, and anything else people should know." aria-invalid={!!errors.body} />
        <FieldError>{errors.body}</FieldError>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="post-date" hint="optional">
            {type === "REQUEST" ? "Needed by" : "Available from"}
          </Label>
          <Input id="post-date" name="neededBy" type="date" min={today} aria-invalid={!!errors.neededBy} />
          <FieldError>{errors.neededBy}</FieldError>
        </div>
        <div>
          <Label htmlFor="post-price" hint="optional">
            {type === "REQUEST" ? "Budget (£)" : "Price per day (£)"}
          </Label>
          <Input id="post-price" name="price" inputMode="decimal" placeholder="5" aria-invalid={!!errors.price} />
          <FieldError>{errors.price}</FieldError>
        </div>
      </div>
      <div>
        <PhotoUploader name="photos" max={4} label="Add photos (optional)" showCover={false} onChange={(_, b) => setBusy(b)} />
        <FieldError>{errors.photos}</FieldError>
      </div>
      {state?.error && <FormAlert>{state.error}</FormAlert>}
      <Button type="submit" className="w-full sm:w-auto" disabled={pending || busy}>
        {pending && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
        Post to the board
      </Button>
    </form>
  );
}

export function CommentForm({ slug, postId }: { slug: string; postId: string }) {
  const [state, action, pending] = useActionState<CommentState, FormData>(addCommunityComment, undefined);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state?.ok]);
  return (
    <form ref={ref} action={action} className="space-y-2">
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="postId" value={postId} />
      <Label htmlFor="comment">Reply</Label>
      <Textarea id="comment" name="body" rows={3} maxLength={500} required placeholder="I can help — I'm at Sussex Place until 5pm." />
      {state?.error && <FormAlert>{state.error}</FormAlert>}
      <Button type="submit" size="sm" disabled={pending}>
        {pending && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
        Send reply
      </Button>
    </form>
  );
}
