import { Container } from "@/components/ui";

export default function Loading() {
  return (
    <Container className="animate-pulse pt-4 pb-12 md:pt-8" aria-hidden>
      <div className="h-4 w-40 rounded bg-surface" />
      <div className="mt-3 h-9 w-2/3 rounded bg-surface" />
      <div className="mt-6 grid gap-12 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="aspect-[4/3] rounded-3xl bg-surface" />
        <div className="hidden h-96 rounded-[1.25rem] bg-surface lg:block" />
      </div>
    </Container>
  );
}
