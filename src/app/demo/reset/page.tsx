import type { Metadata } from "next";
import { Container } from "@/components/ui";
import { demoResetEnabled } from "@/server/demo-reset";
import { ResetForm } from "./reset-form";

export const metadata: Metadata = { title: "Reset demo data", robots: { index: false } };
export const maxDuration = 60;

export default function ResetPage() {
  return (
    <Container className="max-w-md py-16">
      <h1 className="text-3xl font-semibold">Reset demo data</h1>
      <p className="mt-2 text-muted">
        Puts the app back to its starting state with fresh dates relative to today. Every account and booking made since is deleted and everyone is logged out.
      </p>
      <div className="mt-8">
        {demoResetEnabled() ? (
          <ResetForm />
        ) : (
          <p className="rounded-xl bg-surface p-4 text-sm">
            Resetting from the browser is turned off. Set the <code className="font-mono">DEMO_RESET_KEY</code> environment variable to enable it, or run{" "}
            <code className="font-mono">npm run db:seed</code>.
          </p>
        )}
      </div>
    </Container>
  );
}
