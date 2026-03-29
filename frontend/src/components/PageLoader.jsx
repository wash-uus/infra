/**
 * PageLoader
 * 
 * Lightweight skeleton loader shown while lazy-loaded pages are being fetched.
 * Uses CSS animations for smooth UX without heavy libraries.
 */
export default function PageLoader() {
  return (
    <div className="page-bg min-h-screen">
      <div className="mx-auto max-w-3xl px-6 py-16 space-y-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="h-14 animate-pulse rounded-2xl bg-zinc-900"
          />
        ))}
      </div>
    </div>
  );
}
