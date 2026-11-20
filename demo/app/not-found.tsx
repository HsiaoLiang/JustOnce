import { Container, LinkButton } from "@/components/ui";
import { LogoMark } from "@/components/logo";
import { REPO_URL } from "@demo/lib/site";

export default function NotFound() {
  return (
    <Container className="flex max-w-lg flex-col items-center py-24 text-center">
      <LogoMark className="h-10 opacity-90" />
      <h1 className="mt-6 text-3xl font-semibold">That page isn&apos;t in the demo</h1>
      <p className="mt-2 text-muted">
        This static demo covers browsing, items and communities. Accounts, bookings and listing forms live in the full app on{" "}
        <a href={REPO_URL} className="font-semibold text-ink underline underline-offset-4">
          GitHub
        </a>
        .
      </p>
      <div className="mt-8 flex gap-3">
        <LinkButton href="/">Go home</LinkButton>
        <LinkButton href="/search" variant="secondary">
          Browse items
        </LinkButton>
      </div>
    </Container>
  );
}
