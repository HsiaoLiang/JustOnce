"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { login, signup, type AuthState } from "@/server/actions/auth";
import { areasByRegion } from "@/lib/areas";
import { Button, FieldError, FormAlert, Input, Label, Select } from "./ui";

function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? "One moment…" : children}
    </Button>
  );
}

export function LoginForm({ next }: { next: string }) {
  const [state, action] = useActionState<AuthState, FormData>(login, undefined);
  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="next" value={next} />
      <FormAlert>{state?.error}</FormAlert>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required defaultValue={state?.values?.email} />
      </div>
      <div>
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </div>
      <SubmitButton>Log in</SubmitButton>
      <p className="text-center text-sm text-muted">
        New here?{" "}
        <Link href={`/signup?next=${encodeURIComponent(next)}`} className="font-semibold text-ink underline decoration-accent decoration-2 underline-offset-4">
          Create an account
        </Link>
      </p>
    </form>
  );
}

export function SignupForm({ next }: { next: string }) {
  const [state, action] = useActionState<AuthState, FormData>(signup, undefined);
  const errors = state?.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="next" value={next} />
      <FormAlert>{state?.error}</FormAlert>
      <div>
        <Label htmlFor="name">Your name</Label>
        <Input id="name" name="name" autoComplete="name" required defaultValue={state?.values?.name} aria-invalid={!!errors.name} aria-describedby="name-error" />
        <FieldError id="name-error">{errors.name}</FieldError>
      </div>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required defaultValue={state?.values?.email} aria-invalid={!!errors.email} aria-describedby="email-error" />
        <FieldError id="email-error">{errors.email}</FieldError>
      </div>
      <div>
        <Label htmlFor="password" hint="At least 8 characters">Password</Label>
        <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} aria-invalid={!!errors.password} aria-describedby="password-error" />
        <FieldError id="password-error">{errors.password}</FieldError>
      </div>
      <div>
        <Label htmlFor="area" hint="Optional">Where in London are you?</Label>
        <Select id="area" name="area" defaultValue={state?.values?.area ?? ""}>
          <option value="">Choose an area</option>
          {areasByRegion().map(({ region, areas }) => (
            <optgroup key={region.id} label={region.label}>
              {areas.map((a) => (
                <option key={a.slug} value={a.slug}>{a.name}</option>
              ))}
            </optgroup>
          ))}
        </Select>
      </div>
      <SubmitButton>Create account</SubmitButton>
      <p className="text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href={`/login?next=${encodeURIComponent(next)}`} className="font-semibold text-ink underline decoration-accent decoration-2 underline-offset-4">
          Log in
        </Link>
      </p>
    </form>
  );
}
