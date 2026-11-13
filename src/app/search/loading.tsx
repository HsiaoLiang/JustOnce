import { Container } from "@/components/ui";
import { CardGridSkeleton } from "@/components/skeletons";

export default function Loading() {
  return (
    <Container className="py-6 md:py-8">
      <div className="h-10 w-80 max-w-full animate-pulse rounded-full bg-surface" />
      <div className="mt-6 h-11 animate-pulse rounded-xl bg-surface" />
      <div className="mt-8 mb-6 h-8 w-64 animate-pulse rounded bg-surface" />
      <CardGridSkeleton />
    </Container>
  );
}
