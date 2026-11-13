export function CardGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-9 min-[480px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="animate-pulse">
          <div className="aspect-[4/3] rounded-2xl bg-surface" />
          <div className="mt-3 h-4 w-3/4 rounded bg-surface" />
          <div className="mt-2 h-3 w-1/2 rounded bg-surface" />
        </div>
      ))}
    </div>
  );
}
