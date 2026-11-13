import { Container, LinkButton } from "@/components/ui";
import { LogoMark } from "@/components/logo";

export default function NotFound() {
  return (
    <Container className="flex max-w-lg flex-col items-center py-24 text-center">
      <LogoMark className="h-10 opacity-90" />
      <h1 className="mt-6 text-3xl font-semibold">We can&apos;t find that page</h1>
      <p className="mt-2 text-muted">It may have been rented out of existence. Or the link has a typo.</p>
      <div className="mt-8 flex gap-3">
        <LinkButton href="/">Go home</LinkButton>
        <LinkButton href="/search" variant="secondary">
          Browse items
        </LinkButton>
      </div>
    </Container>
  );
}
