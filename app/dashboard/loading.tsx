export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-7xl animate-pulse space-y-6">
      <div className="h-28 rounded-xl bg-teal-100" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => <div key={index} className="h-28 rounded-lg bg-white" />)}
      </div>
      <div className="grid gap-6 xl:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => <div key={index} className="h-64 rounded-xl bg-white" />)}
      </div>
    </main>
  );
}
