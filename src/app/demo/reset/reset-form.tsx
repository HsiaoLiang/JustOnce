"use client";

import { useActionState } from "react";
import { resetDemo, type ResetState } from "./actions";
import { Button, FormAlert, Input, Label } from "@/components/ui";

export function ResetForm() {
  const [state, action, pending] = useActionState<ResetState, FormData>(resetDemo, undefined);
  return (
    <form action={action} className="space-y-4">
      <div>
        <Label htmlFor="key">Reset key</Label>
        <Input id="key" name="key" type="password" autoComplete="off" required />
      </div>
      <FormAlert>{state?.error}</FormAlert>
      <Button type="submit" variant="dark" disabled={pending}>
        {pending ? "Resetting…" : "Reset demo data"}
      </Button>
    </form>
  );
}
