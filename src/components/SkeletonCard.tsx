export function SkeletonCard() {
  return (
    <div className="flex gap-3 p-3 rounded-xl bg-[#1a1a2e] border border-violet-900/20">
      <div className="w-16 h-20 flex-shrink-0 rounded-lg skeleton" />
      <div className="flex-1 flex flex-col justify-between py-1">
        <div className="space-y-2">
          <div className="h-3.5 rounded-md skeleton w-3/4" />
          <div className="h-2.5 rounded-md skeleton w-1/3" />
        </div>
        <div className="flex gap-1.5">
          <div className="h-4 rounded skeleton w-12" />
          <div className="h-4 rounded skeleton w-16" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonDetailHero() {
  return (
    <div className="px-4 pb-5">
      <div className="flex gap-4">
        <div className="w-28 h-36 flex-shrink-0 rounded-xl skeleton" />
        <div className="flex-1 flex flex-col justify-between py-1">
          <div className="space-y-2">
            <div className="h-4 rounded skeleton w-full" />
            <div className="h-4 rounded skeleton w-2/3" />
            <div className="h-3 rounded skeleton w-1/4" />
          </div>
          <div className="space-y-1.5">
            <div className="flex gap-1">
              <div className="h-5 rounded-md skeleton w-14" />
              <div className="h-5 rounded-md skeleton w-20" />
            </div>
            <div className="flex gap-1">
              <div className="h-5 rounded-md skeleton w-16" />
            </div>
          </div>
        </div>
      </div>
      <div className="mt-4 h-12 rounded-xl skeleton" />
    </div>
  );
}

export function SkeletonLevel() {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-[#0f0f1a] border border-slate-800">
      <div className="w-5 h-5 rounded-md skeleton flex-shrink-0" />
      <div className="w-5 skeleton h-3 rounded" />
      <div className="flex-1 h-3 rounded skeleton" style={{ width: `${50 + Math.random() * 40}%` }} />
    </div>
  );
}
