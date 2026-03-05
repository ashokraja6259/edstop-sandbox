// FILE: src/app/admin/dashboard/loading.tsx

export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50 p-8 space-y-6 animate-pulse">
      <div className="h-10 bg-gray-300 rounded w-1/3" />
      <div className="grid grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 bg-gray-300 rounded-xl" />
        ))}
      </div>
      <div className="h-80 bg-gray-300 rounded-xl" />
    </div>
  );
}